import type { App } from "vue";

/**
 * 1. 注册 www.iconfont.cn 图标库
 * 用法：
 * <font-icon name="tuichu" :size="20" color="#1890ff" />
 * <i class="iconfont i-font-tuichu"></i>
 */
import FontIcon from "@/components/Icons/FontIcon.vue";
function setupFontIcon(app: App<Element>) {
  app.component("FontIcon", FontIcon);
}

/**
 * 2. 注册 element-plus 图标库
 * 用法：
 * <el-icon :size="size" :color="color"><Edit /></el-icon>
 * <Edit />
 */
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
function setupElIcons(app: App<Element>) {
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }
}

/**
 * 3. 通过 uno.config.ts 注册 assets/icons
 * 备注：不支持文件夹，外围需要包裹一层元素
 * 用法：
 * <CommonWrapper>
 *   <div text-20px class="i-svg:wechat" />
 * </CommonWrapper>
 */

/**
 * 4. 通过 vite.config.ts 注册 assets/svgs
 * 备注：支持文件夹 {collection}/{icon}.svg
 * 用法：
 * <svg-icon name="api" />
 * <svg-icon name="collection-icon" />
 */
import SvgIcon from "@/components/Icons/SvgIcon.vue";
function setupSvgIcon(app: App<Element>) {
  app.component("SvgIcon", SvgIcon);
}

// 注册所有图标
export function setupIcons(app: App<Element>) {
  setupElIcons(app);
  setupFontIcon(app);
  setupSvgIcon(app);
}
