// https://unocss.nodejs.cn/guide/config-file
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

import { FileSystemIconLoader } from "@iconify/utils/lib/loader/node-loaders";
import fs from "node:fs";
import path from "node:path";

// 本地SVG图标目录
const iconsDir = "./src/assets/icons";

/**
 * 递归扫描目录，收集所有 SVG 文件并生成 safelist
 * 子目录中的图标使用 `i-svg:子目录/图标名` 的格式
 */
const generateSafeList = (dir: string = iconsDir, prefix: string = ""): string[] => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) {
        // 递归处理子目录，前缀追加目录名
        const subPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
        return generateSafeList(path.join(dir, entry.name), subPrefix);
      }
      if (entry.name.endsWith(".svg")) {
        const iconName = entry.name.replace(".svg", "");
        const fullName = prefix ? `${prefix}/${iconName}` : iconName;
        return [`i-svg:${fullName}`];
      }
      return [];
    });
  } catch (error) {
    console.error("无法读取图标目录:", error);
    return [];
  }
};

export default defineConfig({
  // 自定义快捷类
  shortcuts: {
    "wh-full": "w-full h-full",
    "flex-center": "flex justify-center items-center",
    "flex-x-center": "flex justify-center",
    "flex-y-center": "flex items-center",
    "flex-x-start": "flex items-center justify-start",
    "flex-x-between": "flex items-center justify-between",
    "flex-x-end": "flex items-center justify-end",
  },
  theme: {
    colors: {
      primary: "var(--el-color-primary)",
      primary_dark: "var(--el-color-primary-light-5)",
    },
    breakpoints: Object.fromEntries(
      [640, 768, 1024, 1280, 1536, 1920, 2560].map((size, index) => [
        ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl"][index],
        `${size}px`,
      ])
    ),
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      // 额外属性
      extraProperties: {
        display: "inline-block",
        width: "1em",
        height: "1em",
      },
      // 图标集合
      collections: {
        // svg 是图标集合名称，使用 `i-svg:图标名` 或 `i-svg:子目录/图标名` 调用
        svg: FileSystemIconLoader(iconsDir, (svg) => {
          // 如果 `fill` 没有定义，则添加 `fill="currentColor"`
          return svg.includes('fill="') ? svg : svg.replace(/^<svg /, '<svg fill="currentColor" ');
        }),
      },
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        // ...
      },
    }),
  ],
  safelist: generateSafeList(),
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
