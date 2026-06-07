/**
 * Vue Router 类型扩展
 */
import "vue-router";

declare module "vue-router" {
  // https://router.vuejs.org/zh/guide/advanced/meta.html#typescript
  // 可以通过扩展 RouteMeta 接口来输入 meta 字段
  interface RouteMeta {
    /**
     * 菜单名称
     * @example 'Dashboard'
     */
    title?: string;

    /**
     * 菜单图标
     * @example 'el-icon-edit'
     */
    icon?: string;

    /**
     * 跳转方式（redirect和window将不会出现在tagview中）
     */
    target?: "" | "redirect" | "iframe" | "window" | undefined;

    /**
     * 跳转路径（主要为第三方系统的地址）
     * @example 'https://www.uoquo.com'
     */
    src?: string;

    /**
     * 路由参数（拼接到地址中的可见参数）
     * @example 't=a'
     */
    querys?: Record<string, string>;

    /**
     * 隐式参数（不显示拼接到路由地址中，但会拼接到src中，常用于iframe模式）
     * @example 'user={USER_CODE}'
     */
    params?: Record<string, string>;

    /**
     * 是否隐藏菜单
     * true 隐藏, false 显示
     * @default false
     */
    hidden?: boolean;

    /**
     * 始终显示父级菜单，即使只有一个子菜单
     * true 显示父级菜单, false 隐藏父级菜单，显示唯一子节点
     * @default false
     */
    alwaysShow?: boolean;

    /**
     * 是否固定在页签上
     * true 固定, false 不固定
     * @default false
     */
    affix?: boolean;

    /**
     * 是否缓存页面
     * true 缓存, false 不缓存
     * @default false
     */
    keepAlive?: boolean;

    /**
     * 是否在面包屑导航中隐藏
     * true 隐藏, false 显示
     * @default false
     */
    breadcrumb?: boolean;
    activeMenu?: string;
  }
}
