import FingerprintJS from "@fingerprintjs/fingerprintjs";
import type { TokenDto } from "@/api/auth";
import { STORAGE_KEYS } from "@/constants";
import { Storage } from "./storage";

const { pkg } = __APP_INFO__;
const ACCESS_TOKEN_KEY = `${pkg.name}-access-token`;
const REFRESH_TOKEN_KEY = `${pkg.name}-refresh-token`;
const DEVICE_ID_KEY = "UOQUO_DEVICE_ID";

import { useUserStoreHook } from "@/stores";
import router from "@/router";

// 负责本地凭证与偏好的读写
export const AuthStorage = {
  getAccessToken(): string {
    const isRememberMe = Storage.get<boolean>(STORAGE_KEYS.REMEMBER_ME, false);
    return isRememberMe
      ? Storage.get(ACCESS_TOKEN_KEY, "")
      : Storage.sessionGet(ACCESS_TOKEN_KEY, "");
  },

  getRefreshToken(): string {
    const isRememberMe = Storage.get<boolean>(STORAGE_KEYS.REMEMBER_ME, false);
    return isRememberMe
      ? Storage.get(REFRESH_TOKEN_KEY, "")
      : Storage.sessionGet(REFRESH_TOKEN_KEY, "");
  },

  setTokens(token: TokenDto): void {
    const rememberMe = Storage.get<boolean>(STORAGE_KEYS.REMEMBER_ME, false);
    if (rememberMe) {
      Storage.set(ACCESS_TOKEN_KEY, token.accessToken);
      Storage.set(REFRESH_TOKEN_KEY, token.refreshToken);
    } else {
      Storage.sessionSet(ACCESS_TOKEN_KEY, token.accessToken);
      Storage.sessionSet(REFRESH_TOKEN_KEY, token.refreshToken);
      Storage.remove(ACCESS_TOKEN_KEY);
      Storage.remove(REFRESH_TOKEN_KEY);
    }
  },

  clearTokens(): void {
    Storage.remove(ACCESS_TOKEN_KEY);
    Storage.remove(REFRESH_TOKEN_KEY);
    Storage.sessionRemove(ACCESS_TOKEN_KEY);
    Storage.sessionRemove(REFRESH_TOKEN_KEY);
  },

  setRememberMe(rememberMe: boolean = false): void {
    Storage.set(STORAGE_KEYS.REMEMBER_ME, rememberMe);
  },

  getRememberMe(): boolean {
    return Storage.get<boolean>(STORAGE_KEYS.REMEMBER_ME, false);
  },

  /**
   * 应用授权信息
   */
  getAppkey(): string {
    return "K4X3Z5W9H6Q0J7Q4";
  },
  getSecret(): string {
    return "lN0dU9iI4rT2wR2jD5cE1sL5nL6sE6zC";
  },

  /**
   * 浏览器指纹
   */
  async loadDeviceId() {
    const deviceId = this.getDevcieId();
    if (!deviceId) {
      // 初始化 FingerprintJS
      const fp = await FingerprintJS.load();
      // 获取指纹结果
      const result = await fp.get();
      // 缓存访客ID
      Storage.set(DEVICE_ID_KEY, result.visitorId);
    }
  },
  getDevcieId() {
    return Storage.get(DEVICE_ID_KEY, "");
  },
};

/**
 * 重定向到登录页面
 */
let redirectingToLogin = false;
export async function redirectToLogin(
  message: string = "请重新登录",
  notify: boolean = true
): Promise<void> {
  if (redirectingToLogin) return;
  redirectingToLogin = true;

  if (notify) {
    ElNotification({
      title: "提示",
      message,
      type: "warning",
      duration: 3000,
    });
  }

  await useUserStoreHook().resetAllState();

  try {
    // 跳转到登录页，保留当前路由用于登录后跳转
    const currentPath = router.currentRoute.value.fullPath;
    await router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
  } catch (error) {
    console.error("Redirect to login error:", error);
    // 强制跳转，即使路由重定向失败
    window.location.href = "/login";
  } finally {
    redirectingToLogin = false;
  }
}
