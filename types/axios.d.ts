import { AxiosRequestConfig } from "axios";

// 扩展Axios配置类型，添加silent标记
declare module "axios" {
  interface AxiosRequestConfig {
    silent?: boolean; // 是否静默（不弹全局提示）
    _retry?: boolean; // 是否重试（用于请求失败时自动重试）
    _skipQueue?: boolean; // 是否跳过请求队列
  }
}
