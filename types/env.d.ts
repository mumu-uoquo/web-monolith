/// <reference types="vite/client" />

/**
 * Vite 环境变量类型定义
 * https://cn.vitejs.dev/guide/env-and-mode
 */
interface ImportMetaEnv {
  /** 应用端口 */
  readonly VITE_APP_PORT: number;
  /** 应用名称 */
  readonly VITE_APP_NAME: string;
  /** API 基础路径(代理前缀) */
  readonly VITE_APP_BASE_API: string;
  /** API 地址 */
  readonly VITE_APP_API_URL: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_TENANT_ENABLED?: string;
  /** 是否开启 Mock 服务 */
  readonly VITE_MOCK_DEV_SERVER: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * 平台的名称、版本、运行所需的`node`版本、依赖、构建时间的类型提示
 */
declare const __APP_INFO__: {
  pkg: {
    name: string;
    version: string;
    engines: {
      node: string;
    };
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  buildTimestamp: number;
};
