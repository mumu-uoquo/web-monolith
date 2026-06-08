import type { AxiosRequestConfig } from "axios";
import { http } from "@/utils/http";
const USER_BASE_URL = "/health/api/platform";

/**
 * 用户认证相关
 */
const AuthAPI = {
  /**
   * 用户账号登录
   * @param data 用户登录
   */
  accountLogin(data: UserLoginParam, config?: AxiosRequestConfig) {
    return http.request<UserAuthDto>("post", `${USER_BASE_URL}/v1/auth/account/login`, {
      data,
      ...config,
    });
  },

  /**
   * 获取验证码图片
   * @param data 用户登录
   */
  getCaptcha(data: UserLoginParam, config?: AxiosRequestConfig) {
    return http.request<string>("post", `${USER_BASE_URL}/v1/auth/captcha`, {
      data,
      ...config,
    });
  },

  /**
   * 当前用户信息
   * @param data 用户登录
   */
  getInfo(data: UserLoginParam, config?: AxiosRequestConfig) {
    return http.request<UserAuthDto>("post", `${USER_BASE_URL}/v1/auth/info`, {
      data,
      ...config,
    });
  },

  /**
   * 用户登出
   */
  logout(config?: AxiosRequestConfig) {
    return http.request<string>("post", `${USER_BASE_URL}/v1/auth/logout`, {
      ...config,
    });
  },

  /**
   * 验证TOTP（登录二次验证）
   * @param data 用户登录
   */
  mfaLogin(data: UserLoginParam, config?: AxiosRequestConfig) {
    return http.request<UserAuthDto>("post", `${USER_BASE_URL}/v1/auth/mfa/login`, {
      data,
      ...config,
    });
  },

  /**
   * 根据角色获取功能列表（注：仅用于切换角色）
   * @param data 角色ID
   */
  permission(data: IdParam, config?: AxiosRequestConfig) {
    return http.request<ModuleTreeDto[]>("post", `${USER_BASE_URL}/v1/auth/account/permission`, {
      data,
      ...config,
    });
  },

  /**
   * 刷新token登录
   * @param data 用户登录
   */
  tokenLogin(data: UserLoginParam, config?: AxiosRequestConfig) {
    return http.request<TokenDto>("post", `${USER_BASE_URL}/v1/auth/token/login`, {
      data,
      ...config,
    });
  },
};

export default AuthAPI;

/**
 * ID信息
 */
export interface IdParam {
  /** 主键 */
  id: string;
}

/**
 * 模块信息（树状）
 */
export interface ModuleTreeDto {
  /** 子节点 */
  children?: ModuleTreeDto[];
  /** 备注描述 */
  description?: string;
  /** 图标 */
  icon?: string;
  /** 主键 */
  id: string;
  /** 菜单名称 */
  menuName?: string;
  /** 模块编码 */
  moduleCode?: string;
  /** 模块名字 */
  moduleName?: string;
  /** 模块类型 */
  moduleType?: string;
  /** 请求参数 */
  params?: ModuleParam[];
  /** 父模块id */
  parentId?: string;
  /** 菜单路由 */
  path?: string;
  /** 是否新页打开 */
  popup?: boolean;
  /** 排序 */
  sortIdx?: number;
  /** 跳转链接 */
  url?: string;
  /** 是否可见 */
  visible?: boolean;
}

/**
 * 出参：Token信息
 */
export interface TokenDto {
  /** 会话token */
  accessToken: string;
  /** 过期时间（秒） */
  expireTime: number;
  /** 刷新token */
  refreshToken: string;
}

/**
 * 用户认证信息
 */
export interface UserAuthDto {
  /** 会话token */
  accessToken?: string;
  /** 用户头像 */
  avatar?: string;
  /** 当前角色 */
  currentRoleId?: string;
  /** 邮箱 */
  email?: string;
  /** 过期时间（秒） */
  expireTime?: number;
  /** 分组列表 */
  groupList?: GroupDto[];
  /** 用户id */
  id: string;
  /** 用户所属机构id */
  instituteId: string;
  /** 用户所属机构名称 */
  instituteName?: string;
  /** 电话 */
  phone?: string;
  /** 真实姓名 */
  realName?: string;
  /** 推介码 */
  referralCode?: string;
  /** 刷新token */
  refreshToken?: string;
  /** 机构的授权分组（004） */
  roleGroup?: string;
  /** 角色列表 */
  roleList?: UserRoleDto[];
  /** 服务器时间 */
  serverTime?: string;
  /** 用户状态 */
  status?: string;
  /** 双因子状态（disabled-未开启，unbound-未绑定，enabled-已绑定） */
  totpStatus?: string;
  /** 用户姓名（登录账号） */
  userName?: string;
}

/**
 * 用户登录
 */
export interface UserLoginParam {
  /** 登录账号 */
  account?: string;
  /** 发起方版本 */
  appVersion?: string;
  /** 验证码 */
  captcha?: string;
  /** 当前角色 */
  currentRoleId?: string;
  /** 设备标识码 */
  deviceId?: string;
  /** 登录密码 */
  password?: string;
  /** 刷新token */
  refreshToken?: string;
  /** 是否记住 */
  rememberMe?: boolean;
  /** TOTP验证临时Token */
  tempToken?: string;
  /** 双因子动态码 */
  totpCode?: string;
  /** UA（主要用于移动端登录） */
  userAgent?: string;
}

/**
 * 分组信息
 */
export interface GroupDto {
  /** 所属部门 */
  deptId?: string;
  /** 所属部门名称 */
  deptName?: string;
  /** 分组名字 */
  groupName: string;
  /** 分组id */
  id: string;
  /** 用户所属机构id */
  instituteId?: string;
  /** 用户所属机构名称 */
  instituteName?: string;
}

/**
 * 请求参数
 */
export interface ModuleParam {
  /** 说明 */
  description?: string;
  /** 是否可见 */
  enabled?: boolean;
  /** 键 */
  key: string;
  /** 值 */
  val: string;
}

/**
 * 用户角色信息
 */
export interface UserRoleDto {
  /** 角色id */
  id: string;
  /** 角色名字 */
  roleName: string;
}
