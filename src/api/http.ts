import { ElMessage } from "element-plus";

import { useUserStoreHook } from "@/stores";
import { createHttpInstance, type UserStoreAdapter } from "@/utils/http";

const userStoreAdapter: UserStoreAdapter = {
  refreshToken: () => useUserStoreHook().refreshToken(),
};

/**
 * 应用级 HTTP 单例。
 * 在业务层注入 Store 与消息提示，utils/http 仅保留通用实现。
 */
export const http = createHttpInstance(
  {},
  userStoreAdapter,
  (message) =>
    ElMessage({
      message: message || "系统出错",
      grouping: true,
      type: "error",
    })
);

export default http;
