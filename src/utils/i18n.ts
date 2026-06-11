import type { TranslateOptions } from "vue-i18n";
import i18n from "@/plugins/i18n";

/**
 * 导出：路由标题翻译
 */
export function translateRouteTitle(title: any = "") {
  if (!title || typeof title !== "string") {
    return String(title || "");
  }

  try {
    const key = `route.${title}`;
    // 关键：用类型断言指定 t 为可调用函数
    const hasKey = (i18n.global.te as (key: string) => boolean)(key);
    if (hasKey) {
      return (i18n.global.t as (key: string) => string)(key);
    } else {
      return title;
    }
  } catch (error) {
    console.warn("路由标题翻译失败：", title, error);
    return title;
  }
}

/**
 * 导出：国际化转换工具函数
 * @param title  待转换的键
 * @param locale 目标语言（默认为当前语言）
 * @returns 转化后的message
 */
export function translateI18n(title: any = "", locale?: string) {
  if (!title || typeof title !== "string") {
    return String(title || "");
  }

  try {
    const hasKey = (i18n.global.te as (key: string, locale?: TranslateOptions) => boolean)(
      title,
      locale ? { locale } : {}
    );
    if (hasKey) {
      return (i18n.global.t as (key: string, locale?: TranslateOptions) => string)(
        title,
        locale ? { locale } : {}
      );
    } else {
      return title;
    }
  } catch (error) {
    console.warn("翻译失败：", title, locale, error);
    return title;
  }
}
