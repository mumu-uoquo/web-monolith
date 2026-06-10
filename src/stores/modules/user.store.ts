import { store, useDictStoreHook, usePermissionStoreHook, useTagsViewStore } from "@/stores";
import { AuthStorage } from "@/utils/auth";
import AuthAPI, { type UserLoginParam, type UserAuthDto, type TokenDto } from "@/api/auth";
import type { RouteRecordRaw } from "vue-router";
import router from "@/router";

export const useUserStore = defineStore("user", () => {
  // 用户信息
  const userInfo = ref<UserAuthDto>({ id: "", instituteId: "" } as UserAuthDto);

  const permissionStore = usePermissionStoreHook();
  const tagsViewStore = useTagsViewStore();
  const dictStore = useDictStoreHook();

  /**
   * 设置用户信息
   */
  function setUserInfo(data: UserAuthDto) {
    // 如果没指定角色，则默认选中第一个角色
    if (!data.currentRoleId) {
      if (data.roleList && data.roleList.length > 0) {
        data.currentRoleId = data.roleList[0].id;
      }
    }
    Object.assign(userInfo.value, { ...data });
    // 保存记住我状态和token
    const { accessToken, refreshToken, expireTime } = data;
    const token = {
      accessToken: accessToken || "",
      refreshToken: refreshToken || "",
      expireTime: expireTime || 0,
    };
    AuthStorage.setTokens(token);
  }

  /**
   * 获取用户信息
   *
   * @returns {UserAuthDto} 用户信息
   */
  async function getUserInfo(): Promise<UserAuthDto> {
    // 本地有缓存，则获取缓存信息
    if (userInfo.value && userInfo.value.id !== "") {
      return userInfo.value;
    }
    // 本地无缓存时，从服务端获取
    console.log("[UserStore] getUserInfo from server");
    const data = await AuthAPI.getInfo({});
    if (!data) {
      throw new Error("无用户信息，请重新登录");
    }
    if (data.roleList && data.roleList.length > 0) {
      data.currentRoleId = data.roleList[0].id;
    }
    Object.assign(userInfo.value, { ...data });
    return userInfo.value;
  }

  /**
   * 登出
   */
  async function logout() {
    try {
      await AuthAPI.logout();
    } catch (error) {
      console.log("logout error", error);
    } finally {
      resetAllState();
    }
  }

  /**
   * 重置所有系统状态
   * 统一处理所有清理工作，包括用户凭证、路由、缓存等
   */
  function resetAllState() {
    console.log("[UserStore] resetAllState");
    // 1. 重置用户状态
    resetUserState();

    // 2. 重置其他模块状态
    // 重置路由
    permissionStore.resetRouter();
    // 清除字典缓存
    dictStore.clearDictionary();
    // 清除标签视图
    tagsViewStore.delAllViews();

    // 3. 清理 WebSocket 连接
    //cleanupWebSocket();

    return Promise.resolve();
  }

  /**
   * 重置用户状态
   * 仅处理用户模块内的状态
   */
  function resetUserState() {
    console.log("[UserStore] resetUserState");
    // 清除用户凭证
    AuthStorage.clearTokens();
    // 重置用户信息
    userInfo.value = { id: "", instituteId: "" } as UserAuthDto;
  }

  /**
   * 切换角色
   */
  async function changeRole(roleId: string): Promise<RouteRecordRaw[]> {
    userInfo.value.currentRoleId = roleId;
    permissionStore.resetRouter();
    // 重新加载路由
    const routes = await permissionStore.generateRoutes(roleId);
    // 清除标签视图
    await tagsViewStore.delAllViews();
    // 添加动态路由
    routes.forEach((route: RouteRecordRaw) => {
      router.addRoute(route);
    });
    return routes;
  }

  /**
   * 刷新token
   */
  async function refreshToken(): Promise<TokenDto> {
    // 前置校验
    if (!userInfo.value.id) {
      throw new Error("令牌已过期，请重新登录");
    }
    const token = AuthStorage.getRefreshToken();
    if (!token) {
      throw new Error("没有有效的刷新令牌");
    }
    // 刷新令牌
    const param: UserLoginParam = {
      currentRoleId: userInfo.value.currentRoleId,
      refreshToken: token,
    };
    console.log("[UserStore] refreshToken", param, userInfo.value);
    const data = await AuthAPI.tokenLogin(param, { _skipQueue: true, _retry: true });
    if (data) {
      // 更新令牌，保持当前记住我状态
      AuthStorage.setTokens(data);
      return data;
    }
    throw new Error("刷新令牌失败");
  }

  return {
    userInfo,
    isLoggedIn: () => !!AuthStorage.getAccessToken(),
    getUserInfo,
    setUserInfo,
    logout,
    changeRole,
    resetAllState,
    //resetUserState,
    refreshToken,
  };
});

/**
 * 在组件外部使用UserStore的钩子函数
 * @see https://pinia.vuejs.org/core-concepts/outside-component-usage.html
 */
export function useUserStoreHook() {
  return useUserStore(store);
}
