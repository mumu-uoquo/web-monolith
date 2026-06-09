import type { Router, RouteLocationNormalized, RouteRecordRaw } from "vue-router";
import NProgress from "@/plugins/nprogress";
import router from "@/router";
import { usePermissionStore, useUserStore } from "@/stores";

export function setupPermissionGuard() {
  // 白名单（无需登录的页面：登录页、全屏错误页）
  const whiteList = ["/login", "/403", "/404"];

  /**
   * 路由守卫支持的返回类型：
   * true: 放行
   * false: 拦截
   * {path: "/"} 跳转到首页
   * {path: "/login", query: {redirect: to.fullPath}} 跳转到登录页并带上 redirect 参数
   *
   * 注意：异步操作时必须使用 next(); 不能直接 return true;
   */
  router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    const permissionStore = usePermissionStore();
    const userStore = useUserStore();
    NProgress.start();

    try {
      // 白名单处理
      if (whiteList.includes(to.path) || to.path.startsWith("/visitor/")) {
        return true;
      }

      const isLoggedIn = userStore.isLoggedIn();

      // 1. 未登录处理
      if (!isLoggedIn) {
        throw new Error("未登录，无权访问，请登录后再试");
      }

      // 2. 已登录且访问登录页，重定向到首页
      if (to.path === "/login") {
        return { path: "/" };
      }

      // 3. 已登录用户的正常访问
      if (!permissionStore.isDynamicRoutesGenerated) {
        // 路由未生成则生成
        const userInfo = await userStore.getUserInfo();
        if (!userInfo.currentRoleId) {
          throw new Error("无用户角色信息，请重新登录");
        }
        // 获取登录用户角色的授权信息
        const dynamicRoutes = await permissionStore.generateRoutes(userInfo.currentRoleId);
        dynamicRoutes.forEach((route: RouteRecordRaw) => {
          router.addRoute(route);
        });
        return { ...to, replace: true };
      }

      // 检查路由是否存在
      if (to.matched.length === 0) {
        return { path: "/error/404" };
      }

      return true;
    } catch (error) {
      console.error("❌ Route guard error:", error);
      return redirectToLogin(to, from);
    } finally {
      NProgress.done();
    }
  });

  // 后置守卫，保证每次路由跳转结束时关闭进度条
  router.afterEach(() => {
    NProgress.done();
  });
}

// 重定向到登录页
async function redirectToLogin(to: RouteLocationNormalized, _from: RouteLocationNormalized) {
  console.log("permission redirectToLogin: ", Date.now(), to.path, to.fullPath);
  await useUserStore().resetAllState();
  return {
    path: "/login",
    query: { redirect: to.path !== "/login" ? to.fullPath : undefined },
    replace: true,
  };
}
