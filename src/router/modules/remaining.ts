import type { RouteRecordRaw } from "vue-router";

const Layout = () => import("@/layouts/index.vue");

export default [
  // 登录页面
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index.vue"),
    meta: { title: "login", hidden: true },
  },
  // 内部：主框架显示区
  {
    path: "/redirect",
    component: Layout,
    meta: { hidden: true },
    children: [
      {
        path: "/redirect/:path(.*)",
        name: "Redirect",
        component: () => import("@/layouts/redirect.vue"),
        meta: { title: "redirect", hidden: true },
      },
      {
        path: "/iframe/:src(.*)",
        name: "Iframe",
        component: () => import("@/layouts/frame.vue"),
        meta: { title: "iframe", hidden: true },
      },
    ],
  },
  // 访客页面：无需登录的页面（全屏）
  {
    path: "/visitor/:path(.*)*",
    component: () => import("@/views/visitor/dynamic.vue"),
    meta: { title: "visitor", hidden: true },
  },
  // {
  //   path: "/demo",
  //   component: Layout,
  //   meta: { title: "Demo" },
  //   children: [
  //     {
  //       path: "index",
  //       name: "DemoIndex",
  //       component: () => import("@/views/demo/index.vue"),
  //       meta: { title: "测试页面" },
  //     },
  //     // 外链
  //     {
  //       path: "http://www.uoquo.com/s?a=1",
  //       name: "OuterUoquo1",
  //       component: Layout,
  //       meta: { title: "外链弹窗", querys: { wd: "测试1" } },
  //     },
  //     {
  //       path: "/outer/uoquo",
  //       name: "OuterUoquo2",
  //       component: () => import("@/layouts/redirect.vue"),
  //       meta: { title: "带参弹窗", src: "http://www.uoquo.com/s", target: "window", querys: { t: "test" }, params: { wd: "测试1" } },
  //     },
  //     {
  //       path: "/frame/uoquo",
  //       name: "InnerUoquo",
  //       component: () => import("@/layouts/frame.vue"),
  //       meta: { title: "外链内嵌", src: "http://www.uoquo.com/s", target: "iframe", querys: { t: "test" }, params: { wd: "测试1" } },
  //     },
  //     // 内链
  //     {
  //       path: "/redirect/demo/index",
  //       name: "ToDemoIndex0",
  //       component: () => import("@/layouts/redirect.vue"),
  //       meta: { title: "内部跳转0", target: "redirect", querys: { t: "test" }, params: { wd: "测试0" } },
  //     },
  //     {
  //       path: "/inner/redirect",
  //       name: "ToDemoIndex1",
  //       redirect: "/redirect/demo/index",
  //       meta: { title: "内部跳转1（不推荐，无法携带参数）", target: "redirect", querys: { t: "test" }, params: { wd: "测试1" } },
  //     },
  //     {
  //       path: "/inner/comp",
  //       name: "InnerComp",
  //       component: () => import("@/layouts/redirect.vue"),
  //       meta: { title: "内部跳转2", src: "/demo/index", target: "redirect", querys: { t: "test" }, params: { wd: "测试2" } },
  //     },
  //     {
  //       path: "/inner/ecg",
  //       name: "InnerOpen",
  //       component: () => import("@/layouts/redirect.vue"),
  //       meta: { title: "内部弹窗", src: "/visitor/ecg/index", target: "window", querys: { t: "test" }, params: { wd: "测试3" } },
  //     },
  //   ],
  // },
] satisfies Array<RouteRecordRaw>;
