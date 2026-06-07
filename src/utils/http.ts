import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type Method,
} from "axios";

import { useUserStoreHook } from "@/store/modules/user-store";
import { ResultEnum } from "@/enums/system/result.enum";
import type { TokenDto } from "@/api/auth";
import router from "@/router";

import FileUtil from "./file";
import { AuthStorage } from "./auth";
import { encryptMd5, guid } from "./common";

interface OriginalRequest {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class AxiosWithTokenRefresh {
  private baseConfig: AxiosRequestConfig;

  // axios 实例
  private instance: AxiosInstance;

  // 请求队列（用于 token 刷新期间的请求）
  private requestQueue: OriginalRequest[];
  private isRefreshing: boolean;
  private refreshTimer: any;
  private refreshPromise: Promise<any> | null; // 存储刷新 token 的 Promise

  private toLoginTimer: any;

  constructor(config: AxiosRequestConfig = {}) {
    // 基础配置
    this.baseConfig = {
      baseURL: config.baseURL || import.meta.env.VITE_APP_BASE_API,
      timeout: config.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    };

    // 创建 axios 实例
    this.instance = axios.create(this.baseConfig);

    // 请求队列（用于 token 刷新期间的请求）
    this.requestQueue = [];
    this.isRefreshing = false;
    this.refreshTimer = null;
    this.refreshPromise = null;
    this.toLoginTimer = null;

    // 初始化拦截器
    this.httpRequestInterceptors();
    this.httpResponseInterceptors();
  }

  /**
   * 打印调试日志
   */
  private _debug(title: string, logid: string, url: string | undefined, data: any = null) {
    console.log(Date.now(), title, logid, url, data);
  }

  /**
   * 生成请求签名
   */
  private generateSignature(config: InternalAxiosRequestConfig) {
    const accessToken = AuthStorage.getAccessToken();
    const appkey = AuthStorage.getAppkey();
    const secret = AuthStorage.getSecret();
    const device = AuthStorage.getDevcieId();
    const language = "zh-CN";
    const nonce = guid();
    const time = Date.now();
    // 自定义请求头
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      config.headers["token"] = accessToken;
    }
    config.headers["appid"] = appkey;
    config.headers["nonce"] = nonce;
    config.headers["device-id"] = device;
    config.headers["timestamp"] = time;
    config.headers["user-language"] = language;

    const prefix = appkey + accessToken + language + nonce + device + time;
    // 参数处理
    const param = ""; // TODO 按字典排序拼接
    // 消息体处理
    let body = "";
    if (config.data) {
      if (typeof config.data === "string") {
        body = config.data;
      } else {
        body = JSON.stringify(config.data);
      }
    }
    const sign = encryptMd5(prefix + param + body + secret);
    config.headers["signature-app"] = sign;
  }

  /**
   * 刷新 token
   */
  async refreshAccessToken() {
    // 如果已经在刷新，返回同一个 Promise
    if (this.isRefreshing) {
      return this.refreshPromise;
    }
    // 开始刷新token
    this.isRefreshing = true;
    this.refreshPromise = new Promise((resolve, reject) => {
      console.log("刷新 Access Token 开始");
      useUserStoreHook()
        .refreshToken()
        .then((token: TokenDto) => {
          console.log("刷新 Access Token 完成");
          // 设置自动刷新
          if (token.expireTime) {
            this.setupTokenAutoRefresh(token.expireTime);
          }
          // 释放资源
          this.isRefreshing = false;
          this.refreshPromise = null;
          // 处理队列中的请求
          this.processRequestQueue();
          resolve(token);
        })
        .catch((error: any) => {
          console.error("刷新 Access Token 失败", error);
          // 释放资源
          this.isRefreshing = false;
          this.refreshPromise = null;
          // 拒绝所有等待的请求，并重新登录
          this.rejectAllRequests(error);
          this.redirectToLogin();
          // 已经重定向到登录，所以不需要再冒泡处理异常
          // reject(error);
        });
    });

    return this.refreshPromise;
  }

  /**
   * 添加到请求队列
   */
  addToRequestQueue(config: InternalAxiosRequestConfig) {
    return new Promise<void>((resolve, reject) => {
      this._debug("请求等待：", config.headers?.logid, config.url, config.data);
      this.requestQueue.push({ config, resolve, reject });
    });
  }

  /**
   * 处理请求队列
   */
  processRequestQueue() {
    while (this.requestQueue.length > 0) {
      const request: any = this.requestQueue.shift();
      this._debug(
        "请求继续：",
        request.config.headers?.logid,
        request.config.url,
        request.config.data
      );
      this.generateSignature(request.config);
      if (request.config._retry) {
        request.resolve(this.instance(request.config));
      } else {
        request.resolve(request.config);
      }
    }
  }

  /**
   * 拒绝所有等待的请求
   */
  rejectAllRequests(error: any) {
    console.log(`拒绝所有等待的请求，共 ${this.requestQueue.length} 个`);
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    while (this.requestQueue.length > 0) {
      const request: any = this.requestQueue.shift();
      this._debug(
        "请求取消：",
        request.config.headers?.logid,
        request.config.url,
        request.config.data
      );
      // 已经在 refreshAccessToken 重定向到登录页了，所以此处也不需要触发原接口调用处的异常处理
      // request.reject(error);
    }
  }

  /**
   * 设置 token 自动刷新
   */
  setupTokenAutoRefresh(expiresIn: number) {
    // 在 token 过期前 1 分钟刷新
    const refreshTime = (expiresIn - 60) * 1000;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshTime);
  }

  /**
   * 判断是否跳过队列
   */
  private checkSkipQueue(config: InternalAxiosRequestConfig): boolean {
    if (config._skipQueue) {
      return true;
    }
    const whiteList = ["/login", "/token/refresh", "/auth/captcha"];
    return whiteList.some((url) => config.url?.endsWith(url));
  }

  /**
   * 请求拦截器
   */
  private httpRequestInterceptors() {
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig): Promise<any> => {
        // 用于日志追踪
        if (!config.headers.logid) {
          config.headers["logid"] = Date.now();
        }
        // 1. 如果正在重新获取token，则直接加入等待队列
        if (this.isRefreshing && !this.checkSkipQueue(config)) {
          // 将请求加入队列并返回一个特殊的 Promise
          // 这样可以让请求暂停，直到 token 刷新完成
          return this.addToRequestQueue(config);
        }
        // 2. 正常请求，添加签名
        this.generateSignature(config);
        this._debug("请求开始：", config.headers?.logid, config.url, config.data);
        return Promise.resolve(config);
      },
      (error) => {
        this._debug("请求失败：", error.config?.headers?.logid, error.config?.url, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 响应拦截器
   */
  private httpResponseInterceptors() {
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 1. 文件下载（需在调用的地方传入指定参数：responseType: "blob"）
        if (
          response.config.responseType === "blob" ||
          response.config.responseType === "arraybuffer"
        ) {
          // 若响应头中无异常码，则下载文件，否则继续执行按JSON处理内容
          const status = response.headers["response-code"];
          if (!status) {
            return this.handleDownload(response);
          }
        }
        // 2. 普通JSON响应处理
        this._debug(
          "响应内容：",
          response.config?.headers?.logid,
          response.config?.url,
          response.data
        );
        const originalRequest = response.config;
        const { status, data, message } = response.data;
        if (status === ResultEnum.SUCCESS) {
          // 2.1 成功响应的数据处理
          // 如果是PageResult，则需要将 total 转换为 number（后台会将Long转为字符串输出）
          if (
            data &&
            Object.prototype.hasOwnProperty.call(data, "pageNum") &&
            Object.prototype.hasOwnProperty.call(data, "pageSize")
          ) {
            data.pageNum = Number(data.pageNum);
            data.pageSize = Number(data.pageSize);
            data.size = Number(data.size);
            data.total = Number(data.total);
          }
          return data;
        } else if (status === ResultEnum.TOKEN_INVALID && !originalRequest._retry) {
          // 2.2 token 失效的处理
          originalRequest._retry = true; // 标记为已重试
          // 如果正在刷新 token，将请求加入队列
          if (this.isRefreshing) {
            return this.addToRequestQueue(originalRequest);
          }
          // 刷新 token（refreshAccessToken 内部已处理 rejectAllRequests 和 redirectToLogin）
          this.refreshAccessToken().catch(() => {});
          // 放入重试队列
          return this.addToRequestQueue(originalRequest);
        } else if (
          status === ResultEnum.TOKEN_KICK_OUT ||
          status === ResultEnum.PARAM_SIGN_EMPTY ||
          status === ResultEnum.TOKEN_EMPTY
        ) {
          // 2.3 特定异常需跳转登录
          this._debug(
            "成功响应，需跳转登录页",
            response.config?.headers?.logid,
            response.config?.url
          );
          this.redirectToLogin();
          // return Promise.reject(new Error(message || "Error"));
        } else if (response.config?.silent) {
          // 2.4 交由由调用方处理错误
          return Promise.reject(message);
        } else {
          // 2.4 其他异常统一提示
          this.$message(message);
          // 20260517：还需抛出异常打断调用方的执行
          return Promise.reject(message);
        }
      },
      (error) => {
        this._debug("响应失败：", error.config?.headers?.logid, error.config?.url, error.message);
        // 异常处理 非 2xx 状态码 会进入这里
        const originalRequest = error.config;
        // 1. 如果已经重试，则直接返回错误
        if (originalRequest?._retry) {
          return Promise.reject(error);
        }
        if (error.response?.data) {
          const { status, message } = error.response.data;
          // 2. 如果 token 无效，则刷新 token
          if (status === ResultEnum.TOKEN_INVALID) {
            originalRequest._retry = true; // 标记为已重试
            // 如果正在刷新 token，将请求加入队列
            if (this.isRefreshing) {
              return this.addToRequestQueue(originalRequest);
            }
            // 刷新 token（refreshAccessToken 内部已处理 rejectAllRequests 和 redirectToLogin）
            this.refreshAccessToken().catch(() => {});
            // 放入重试队列
            return this.addToRequestQueue(originalRequest);
          } else if (
            status === ResultEnum.TOKEN_KICK_OUT ||
            status === ResultEnum.PARAM_SIGN_EMPTY ||
            status === ResultEnum.TOKEN_EMPTY
          ) {
            // 3. 特定异常需跳转登录
            this._debug(
              "失败响应，跳转登录页",
              error.response.config?.headers?.logid,
              error.response.config?.url
            );
            this.redirectToLogin();
            // return Promise.reject(error);
            return;
          } else if (error.response.config?.silent) {
            // 4. 交由调用方处理错误
            return Promise.reject(message);
          } else {
            // 5. 其他异常统一提示
            this.$message(message);
            // 20260517：还需抛出异常打断调用方的执行
            return Promise.reject(message);
          }
        } else {
          // 没有响应体时，直接交由调用方处理
          return Promise.reject(error);
        }
      }
    );
  }

  /**
   * 信息显示
   */
  private $message(message: string) {
    ElMessage({
      message: message || "系统出错",
      grouping: true,
      type: "error",
    });
  }

  /**
   * 重定向到登录页
   */
  private async redirectToLogin(message?: string) {
    if (this.toLoginTimer) {
      return;
    }
    this.$message(message || "您的会话已过期，请重新登录");
    await useUserStoreHook().resetAllState();
    // 跳转到登录页，保留当前路由用于登录后跳转
    this.toLoginTimer = setTimeout(async () => {
      const currentFullPath = router.currentRoute.value.fullPath;
      this._debug("http.ts redirectToLogin: ", "", currentFullPath, router.currentRoute.value);
      if ("/login" === router.currentRoute.value.path) {
        await router.push(currentFullPath);
      } else {
        await router.push({
          path: "/login",
          query: { redirect: currentFullPath },
          replace: true,
        });
      }
      this.toLoginTimer = null;
    }, 2000);
  }

  /**
   * 处理文件下载
   */
  private handleDownload(response: AxiosResponse) {
    // 从响应头获取文件名
    let filename = FileUtil.parseFileNameByDisposition(response.headers["content-disposition"]);
    if (!filename) {
      filename = FileUtil.generateFileNameByContentType(response.headers["content-type"]);
    }

    // 创建 Blob 对象
    const blob = new Blob([response.data]);

    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    // 清理资源
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // 返回成功消息或原始响应
    return {
      success: true,
      filename,
      message: "文件下载成功",
    };
  }

  /** 通用请求工具函数 */
  public request<V>(method: Method, url: string, config?: AxiosRequestConfig): Promise<V> {
    const axiosConfig = {
      method,
      url,
      ...config,
    } as AxiosRequestConfig;

    // 单独处理自定义请求/响应回调
    return this.instance<any, V>(axiosConfig);
    // return new Promise((resolve, reject) => {
    //   this.instance<any, V>(axiosConfig)
    //     .then((response) => {
    //       resolve(response);
    //     })
    //     .catch((error) => {
    //       reject(error);
    //     });
    // });
  }

  /** 单独抽离的`post`工具函数 */
  public post<P, V>(url: string, data?: P, config?: AxiosRequestConfig): Promise<V> {
    return this.request<V>("post", url, { data, ...config });
  }

  /** 单独抽离的`get`工具函数 */
  public get<P, V>(url: string, data?: P, config?: AxiosRequestConfig): Promise<V> {
    return this.request<V>("get", url, { data, ...config });
  }
}

// 创建单例
let axiosInstance: AxiosWithTokenRefresh;

export function createAxiosInstance(config: AxiosRequestConfig) {
  if (!axiosInstance) {
    axiosInstance = new AxiosWithTokenRefresh(config);
  }
  return axiosInstance;
}

// 默认导出
export const http = createAxiosInstance({});
