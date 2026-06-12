<!--
 * 基于 wangEditor-next 的富文本编辑器组件二次封装
 * 版权所属 © 2021-present 有来开源组织
 *
 * 开源协议：https://opensource.org/licenses/MIT
 * 项目地址：https://gitee.com/youlaiorg/vue3-element-admin
 *
 * 在使用时，请保留此注释，感谢您对开源的支持
-->

<template>
  <div style="z-index: 999; border: 1px solid var(--el-border-color)">
    <!-- 工具栏 -->
    <Toolbar
      v-if="editorRef"
      :key="editorKey"
      :editor="editorRef"
      :mode="mod"
      :default-config="toolbarConfig"
      style="border-bottom: 1px solid var(--el-border-color)"
    />
    <!-- 编辑器 -->
    <Editor
      :key="editorKey"
      v-model="modelValue"
      :style="{ height: height, overflowY: 'hidden' }"
      :default-config="editorConfig"
      :mode="mod"
      @on-created="handleCreated"
      @on-change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import "@wangeditor-next/editor/dist/css/style.css";
import { Toolbar, Editor } from "@wangeditor-next/editor-for-vue";
import { IToolbarConfig, IEditorConfig, SlateElement } from "@wangeditor-next/editor";

// 文件上传 API
import DfsAPI, { UploadFileDto } from "@/api/dfs";
import FileUtil from "@/utils/file";

// 上传图片回调函数类型
type InsertFnType = (_url: string, _alt: string, _href: string) => void;
type ImageElement = SlateElement & {
  src: string;
  alt: string;
  url: string;
  href: string;
};

/* ***************************** 参数定义 ********************************* */
let uploadImages: UploadFileDto[] = [];
const props = defineProps({
  height: {
    type: String,
    default: "500px",
  },
  mod: {
    type: String,
    default: "simple",
  },
  placeholder: {
    type: String,
    default: "请输入内容...",
  },
});
// 双向绑定 - 直接使用 v-model，无需手动 setHtml
const modelValue = defineModel<string>({
  type: String,
  required: false,
  default: "",
});

/* ***************************** 工具栏配置 ********************************* */
// 工具栏：全功能
const _allToolbarConfig = ref<Partial<IToolbarConfig>>({
  toolbarKeys: [
    "headerSelect", // 标题样式
    // 'header1',
    // 'header2',
    // 'header3',
    "blockquote", // 引用
    "|",
    "bold", // 加粗
    "underline", // 下划线
    "italic", // 斜体
    {
      key: "group-more-style", // 以 group 开头
      title: "更多",
      // iconSvg: MORE_SVG,
      // 删除线，代码，上标，下标，清除格式
      menuKeys: ["through", "code", "sup", "sub", "clearStyle"],
    },
    "color", // 文字颜色
    "bgColor", // 背景色
    "|",
    "fontSize", // 字体大小
    "fontFamily", // 字体名称
    "lineHeight", // 行高
    "|",
    "bulletedList", // 无序列表
    "numberedList", // 有序列表
    "todo",
    {
      key: "group-justify", // 以 group 开头
      title: "对齐",
      // iconSvg: JUSTIFY_LEFT_SVG,
      // 左对齐，右对齐，居中对齐，两端对齐
      menuKeys: ["justifyLeft", "justifyRight", "justifyCenter", "justifyJustify"],
    },
    {
      key: "group-indent", // 以 group 开头
      title: "缩进",
      // iconSvg: INDENT_RIGHT_SVG,
      // 增进，缩进
      menuKeys: ["indent", "delIndent"],
    },
    "|",
    "emotion", // 表情
    "insertLink", // 插入链接
    // 'editLink',
    // 'unLink',
    // 'viewLink',
    {
      key: "group-image", // 以 group 开头
      title: "图片",
      // iconSvg: IMAGE_SVG,
      // 插入图片，上传图片
      menuKeys: ["insertImage", "uploadImage"],
    },
    // 'deleteImage',
    // 'editImage',
    // 'viewImageLink',
    {
      key: "group-video", // 以 group 开头
      title: "视频",
      // iconSvg: VIDEO_SVG,
      menuKeys: ["insertVideo", "uploadVideo"],
    },
    // 'deleteVideo',
    "insertTable", // 插入表格
    // 'deleteTable',
    "codeBlock", // 代码块
    // 'codeSelectLang',
    "divider", // 分割线
    "|",
    "undo", // 撤销
    "redo", // 重做
    "|",
    "fullScreen", // 全屏
  ],
});
// 工具栏：标准
const standardToolbarConfig = ref<Partial<IToolbarConfig>>({
  toolbarKeys: [
    "headerSelect", // 标题样式

    "blockquote", // 引用
    "codeBlock", // 代码段
    // "emotion", // 表情
    "|",
    "bold", // 加粗
    "italic", // 斜体
    "underline", // 下划线
    "through", // 删除线
    "fontSize", // 字体大小
    "fontFamily", // 字体名称
    "color", // 文字颜色
    "bgColor", // 背景色
    "|",

    "bulletedList", // 无序列表
    "numberedList", // 有序列表
    "delIndent", // 缩进
    "indent", // 增进

    "lineHeight", // 行高

    "insertLink", // 插入链接
    "insertImage", // 网络图片
    "uploadImage", // 上传图片
    "deleteImage", //删除图片

    "insertTable", // 插入表格

    "|",
    "divider", // 分割线
    "justifyCenter", // 居中对齐
    "justifyJustify", // 两端对齐
    "justifyLeft", // 左对齐
    "justifyRight", // 右对齐

    "undo", // 撤销
    "redo", // 重做
    "clearStyle", // 清除格式
    "fullScreen", // 全屏
  ],
});
// 工具栏：简洁
const simpleToolbarConfig = ref<Partial<IToolbarConfig>>({
  toolbarKeys: [
    "blockquote",
    "headerSelect",
    "|",
    "bold", // 加粗
    "italic", // 斜体
    "color", // 文字颜色
    "clearStyle",
    "|",
    "bulletedList",
    "numberedList",
    {
      key: "group-justify", // 以 group 开头
      title: "对齐",
      // iconSvg: JUSTIFY_LEFT_SVG,
      // 左对齐，右对齐，居中对齐，两端对齐
      menuKeys: ["justifyLeft", "justifyRight", "justifyCenter", "justifyJustify"],
    },
    "|",
    "uploadImage",
    "insertTable",
    "codeBlock",
    "|",
    "undo",
    "redo",
    "|",
    "fullScreen",
  ],
});
// TODO 全屏时展示所有按钮
const toolbarConfig = ref<Partial<IToolbarConfig>>({});

/* ***************************** 编辑器配置 ********************************* */
// 更多详细配置看 https://www.wangeditor.com/v5/menu-config.html
// 编辑器配置
const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder,
  MENU_CONF: {
    uploadImage: {
      // 单个文件的最大体积限制，默认为 2M
      maxFileSize: 2 * 1024 * 1024, // 1M
      // 最多可上传几个文件，默认为 100
      maxNumberOfFiles: 10,
      // 小于该值就插入 base64 格式（而不上传），默认为 0
      base64LimitSize: 5 * 1024, // 5kb
      // 自定义上传
      customUpload(file: File, insertFn: InsertFnType) {
        // 上传图片
        // console.log("customUpload file:", file, insertFn);
        FileUtil.upload(file, { fileName: file.name, fileContent: "", finalFile: true }).then(
          (res) => {
            // console.log("upload res:", res);
            insertFn(res.showPath, file.name, res.filePath);
            uploadImages.push(res);
          }
        );
      },
    } as any,
    insertImage: {
      onInsertedImage(imageNode: ImageElement | null) {
        if (imageNode == null) return;
        const { src, alt, url, href } = imageNode;
        // TODO 记录插入的文件信息，用于上传时的清理
        console.log("inserted image", src, alt, url, href);
      },
    },
  },
};

/* ***************************** 编辑器操作 ********************************* */
// 编辑器实例，必须用 shallowRef，重要！
const editorRef = shallowRef();
const editorKey = ref(0);
const innerUpdating = ref(false);
// 记录 editor 实例，重要！
const handleCreated = (editor: any) => {
  editorRef.value = editor;
};

const handleChange = () => {
  innerUpdating.value = true;
  Promise.resolve().then(() => {
    innerUpdating.value = false;
  });
};

/**
 * 清空编辑器内容
 */
const clearContent = () => {
  editorRef.value.clear();
};

/**
 * 清理临时文件：所有的
 * 注：关闭编辑器时调用
 */
const clearAllFile = () => {
  // 1. 查找被删除的图片
  const clearUploadCodes: string[] = [];
  uploadImages.forEach((item) => {
    clearUploadCodes.push(item.uploadCode || "");
  });
  // console.log("clearAllTempFile", uploadImages, clearUploadCodes);
  if (clearUploadCodes.length == 0) {
    return;
  }
  // 2. 清理图片
  DfsAPI.clearTempFile({ uploadCodes: clearUploadCodes })
    .then((_res) => {
      // 清空缓存的文件
      uploadImages = [];
      // console.log(res);
    })
    .catch((err) => {
      console.log("clearAllFile", err);
    });
};

/**
 * 清理临时文件：未使用的
 * 注：在提交表单后调用
 */
const clearNotUseFile = () => {
  // 1. 编辑器里最终的图片列表
  const editorImageList: string[] = [];
  const imageList = editorRef.value.getElemsByType("image");
  imageList.forEach((item: any) => {
    editorImageList.push(item.src);
  });
  // 2. 查找被删除的图片
  const clearUploadCodes: string[] = [];
  uploadImages.forEach((item) => {
    if (!editorImageList.includes(item.filePath)) {
      clearUploadCodes.push(item.uploadCode || "");
    }
  });
  // console.log("clearTempFile", imageList, uploadImages, clearUploadCodes);
  if (clearUploadCodes.length == 0) {
    return;
  }
  // 3. 清理图片
  DfsAPI.clearTempFile({ uploadCodes: clearUploadCodes })
    .then((_res) => {
      // 去除已清理的图片
      uploadImages = uploadImages.filter((item) => {
        return !clearUploadCodes.includes(item.uploadCode || "");
      });
      // console.log(res);
    })
    .catch((err) => {
      console.log("clearNotUseFile", err);
    });
};
watch(
  () => modelValue.value,
  () => {
    if (innerUpdating.value) return;
    editorRef.value = null;
    editorKey.value += 1;

    if (props.mod == "simple") {
      toolbarConfig.value = simpleToolbarConfig.value;
    } else if (props.mod == "standard") {
      toolbarConfig.value = standardToolbarConfig.value;
    } else {
      toolbarConfig.value = {};
    }
  },
  { immediate: true }
);
/**
 * 页面加载时
 */
onMounted(() => {
  uploadImages = [];
  // handleQuery();
});
/**
 * 暴露给父级组件的方法
 */
defineExpose({
  clearContent,
  clearAllFile,
  clearNotUseFile,
});
// 组件销毁时，也及时销毁编辑器，重要！
onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});
</script>
