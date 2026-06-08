<!-- 图片上传组件 -->
<template>
  <ul class="el-upload-list el-upload-list--picture-card">
    <li v-for="(file, index) in fileList" :key="file.id" class="el-upload-list__item is-success">
      <img v-if="file.isPicture" class="el-upload-list__item-thumbnail" :src="file.showPath" />
      <span v-else>{{ file.fileName }}</span>
      <span class="el-upload-list__item-actions">
        <!-- 预览 -->
        <span v-if="file.isPicture" @click="handlePreviewShown(index)">
          <el-icon><ZoomIn /></el-icon>
        </span>
        <!-- 下载 -->
        <span @click="handlePreviewDown(file)">
          <el-icon><Download /></el-icon>
        </span>
      </span>
    </li>
  </ul>

  <el-image-viewer
    v-if="previewVisible"
    :url-list="previewList"
    :initial-index="previewIndex"
    :zoom-rate="1.2"
    @close="handlePreviewClose"
  />
</template>
<script setup lang="ts">
import { ZoomIn, Download } from "@element-plus/icons-vue";
import { UploadFileDto } from "@/api/dfs";
import FileUtil from "@/utils/file";

/* ***************************** 参数定义 ********************************* */
// 暴露给父级的自定义事件
const emits = defineEmits(["on-download"]);
// 暴露给父级的自定义属性
const props = defineProps({
  /**
   * 自定义样式，用于设置组件的宽度和高度等其他样式
   */
  style: {
    type: Object,
    default: () => {
      return {
        width: "80px",
        height: "80px",
      };
    },
  },
});
// 父级组件绑定的v-modle
const modelValue = defineModel("modelValue", {
  type: [Array] as PropType<UploadFileDto[]>,
  default: () => [],
});
// 属性扩展：文件对象
interface UploadFileInfo extends UploadFileDto {
  isPicture?: boolean;
}
// 当前文件列表
const fileList = ref<UploadFileInfo[]>([]);

/* ***************************** 图片预览 ********************************* */
// 是否显示预览
const previewVisible = ref(false);
// 预览图片的索引
const previewIndex = ref(0);
// 预览图片的列表
const previewList = ref<string[]>([]);

/**
 * 预览图片
 */
const handlePreviewShown = (index: number) => {
  const imageUrl = fileList.value[index].showPath;
  previewIndex.value = previewList.value.findIndex((url) => url === imageUrl);
  previewVisible.value = true;
};

/**
 * 文件下载
 */
const handlePreviewDown = (row: UploadFileDto) => {
  emits("on-download", row);
};

/**
 * 关闭预览
 */
const handlePreviewClose = () => {
  previewVisible.value = false;
};

/* ***************************** 监听器等（需放在最后） ********************************* */
// 监听属性变化
watch(
  modelValue,
  (newVal) => {
    // console.log("watch 触发：", "旧值：", oldVal, "新值：", newVal);
    // 无值
    if (!newVal || newVal.length === 0) {
      fileList.value = [];
      previewList.value = [];
      return;
    }
    // 有值

    fileList.value = newVal.map((file) => {
      const temp = Object.assign({}, file) as UploadFileInfo;
      temp.isPicture = FileUtil.isPicture("", temp.filePath);
      return temp;
    });
    previewList.value = fileList.value
      .filter((file) => file.isPicture)
      .map((file) => file.showPath || "");
  },
  {
    immediate: true, // 是否初始化时立即执行（默认 false）
    // deep: true, // 是否深度监听（对象/数组变化时需要，默认 false）
  }
);
/**
 * 页面加载时
 */
onMounted(() => {});
/**
 * 暴露给父级组件的方法
 */
defineExpose({});
</script>
<style lang="scss" scoped>
.el-upload-list :deep(.el-upload-list__item) {
  width: v-bind("props.style.width");
  height: v-bind("props.style.height");
}
</style>
