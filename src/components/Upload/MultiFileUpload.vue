<!-- 图片上传组件 -->
<template>
  <el-upload
    v-model:file-list="fileList"
    list-type="picture-card"
    :show-file-list="true"
    :accept="props.accept"
    :limit="props.limit"
    :before-upload="handleBeforeUpload"
    :http-request="handleUpload"
    :on-success="onSuccess"
    :on-error="onError"
    :on-exceed="onExceed"
    :multiple="false"
    :disabled="uploadDisabled"
  >
    <el-icon><Plus /></el-icon>
    <template #file="{ file, index }">
      <div v-if="file.status === 'ready'">
        <!-- 上传过程中展示进度环 -->
        <el-progress
          :percentage="progressPercent"
          :status="progressStatus"
          :show-text="false"
          :width="progressWidth"
          type="circle"
        />
      </div>
      <div v-else>
        <!-- 缩略图（非图片时展现名称）-->
        <el-image
          v-if="(file as any).isPicture"
          :src="(file as any).showPath"
          fit="contain"
          class="el-upload-list__item-image"
        >
          <template #error>
            <el-text class="el-upload-list__item-name">{{ file.name }}</el-text>
          </template>
        </el-image>
        <el-text v-else class="el-upload-list__item-name">{{ file.name }}</el-text>
        <!-- 操作按钮 -->
        <span class="el-upload-list__item-actions">
          <span v-if="(file as any).isPicture" @click="handlePreviewShown(index)">
            <el-icon><ZoomIn /></el-icon>
          </span>
          <span v-else-if="(file as any).showPath" @click="handlePreviewDown(index)">
            <el-icon><Download /></el-icon>
          </span>
          <span @click="handleRemove(index)">
            <el-icon><Delete /></el-icon>
          </span>
        </span>
      </div>
    </template>
  </el-upload>
  <!-- 图片大图查看器 -->
  <el-image-viewer
    v-if="previewVisible"
    :url-list="previewList"
    :initial-index="previewIndex"
    :zoom-rate="1.2"
    @close="handlePreviewClose"
  />
</template>
<script setup lang="ts">
import { Plus, Delete, ZoomIn, Download } from "@element-plus/icons-vue";
import { UploadRawFile, UploadRequestOptions, UploadUserFile } from "element-plus";
import DfsAPI, { UploadFileDto } from "@/api/dfs";
import FileUtil from "@/utils/file";

/* ***************************** 参数定义 ********************************* */
// 暴露给父级的自定义属性
const props = defineProps({
  /**
   * 请求携带的额外参数
   */
  data: {
    type: Object,
    default: () => {
      return {};
    },
  },
  /**
   * 文件上传数量限制
   * 默认10个
   */
  limit: {
    type: Number,
    default: 10,
  },
  /**
   * 单个文件的最大允许大小
   * 单位MB，默认5MB
   */
  maxFileSize: {
    type: Number,
    default: 5,
  },
  /**
   * 上传文件类型
   * 默认支持所有文件(*)，指定格式示例：'image/*,.png,.jpg,.jpeg,.gif,.bmp'
   */
  accept: {
    type: String,
    default: "*",
  },
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
// 属性扩展：文件对象
interface UploadFileInfo extends UploadUserFile {
  fileId?: string;
  fileMd5?: string;
  filePath: string;
  showPath?: string;
  fileSize?: number;
  fileType?: string;
  uploadCode?: string;
  isPicture?: boolean;
}
// 当前上传的文件列表
const fileList = ref<UploadFileInfo[]>([]);

/* ***************************** 上传处理 ********************************* */
// 上传按钮是否禁用
const uploadDisabled = ref(false);
/**
 * 上传前校验
 */
function handleBeforeUpload(file: UploadRawFile) {
  // 校验文件类型：虽然 accept 属性限制了用户在文件选择器中可选的文件类型，但仍需在上传时再次校验文件实际类型，确保符合 accept 的规则
  const acceptTypes = props.accept.split(",").map((type) => type.trim());

  // 1. 检查文件格式是否符合 accept
  const isValidType = acceptTypes.some((type) => {
    if (!type || type === "" || type === "*") {
      // 默认无限制
      return true;
    } else if (type === "image/*") {
      // 如果是 image/*，检查 MIME 类型是否以 "image/" 开头
      return file.type.startsWith("image/");
    } else if (type.startsWith(".")) {
      // 如果是扩展名 (.png, .jpg)，检查文件名是否以指定扩展名结尾
      return file.name.toLowerCase().endsWith(type);
    } else {
      // 如果是具体的 MIME 类型 (image/png, image/jpeg)，检查是否完全匹配
      return file.type === type;
    }
  });
  if (!isValidType) {
    ElMessage.warning(`上传文件的格式不正确，仅支持：${props.accept}`);
    return false;
  }

  // 2. 限制文件大小
  if (file.size > props.maxFileSize * 1024 * 1024) {
    ElMessage.warning("上传文件不能大于" + props.maxFileSize + "M");
    return false;
  }
  return true;
}
/**
 * 上传文件超出限制
 */
function onExceed() {
  ElMessage.warning("最多只能上传" + props.limit + "张图片");
}

/*
 * 上传文件
 */
function handleUpload(options: UploadRequestOptions) {
  return new Promise((resolve, reject) => {
    // // 处理附加参数
    // const formData = new FormData();
    // Object.keys(props.data).forEach((key) => {
    //   formData.append(key, props.data[key]);
    // });
    const file = options.file;
    progressOnStart();
    FileUtil.upload(
      file,
      { fileName: file.name, fileContent: "", finalFile: false },
      progressOnChange
    )
      .then((res) => {
        progressOnSuccess();
        resolve(res);
      })
      .catch((error) => {
        progressOnError();
        reject(error);
      });
  });
}

/**
 * 上传成功回调
 * @param fileInfo 上传成功后服务端返回的信息
 * @param uploadFile 选择的上传文件信息
 */
const onSuccess = (fileInfo: UploadFileDto, uploadFile: UploadUserFile) => {
  ElMessage.success("上传成功");
  // console.log("onSuccess", fileInfo, uploadFile);
  // 超出限制则不能再上传
  uploadDisabled.value = fileList.value.length >= props.limit;
  // 补充fileList对象的属性
  const file = fileList.value.find((file) => file.uid === uploadFile.uid);
  if (!file) {
    console.log("file not found", uploadFile);
    return;
  }
  file.status = "success";
  file.fileMd5 = fileInfo.fileMd5;
  file.fileSize = fileInfo.fileSize;
  file.fileType = fileInfo.fileType;
  file.filePath = fileInfo.filePath;
  file.showPath = fileInfo.showPath;
  file.uploadCode = fileInfo.uploadCode;
  file.isPicture = FileUtil.isPicture(uploadFile.raw!.type, uploadFile.name);
  if (file.isPicture) {
    // 添加到缩略图列表
    previewList.value.push(fileInfo.showPath);
  }
};

/**
 * 上传失败回调
 */
const onError = (error: any) => {
  console.log("onError", error);
  // ElMessage.error("上传失败: " + error.message);
};

/**
 * 删除图片
 */
function handleRemove(index: number) {
  const fileInfo = fileList.value[index];
  if (!fileInfo) {
    console.log("handleRemove file not found", index);
    return;
  }
  // console.log("handleRemove", fileInfo);
  // 如果没有上传码，则不需要删除服务端文件
  if (!fileInfo.uploadCode) {
    _removeFileList(index, fileInfo);
    return;
  }
  DfsAPI.clearTempFile({ uploadCodes: [fileInfo.uploadCode] }).then(() => {
    _removeFileList(index, fileInfo);
  });
}
// 删除对应的文件列表
function _removeFileList(index: number, file: UploadFileInfo) {
  // 删除文件列表
  fileList.value.splice(index, 1);
  // 删除缩略图列表
  const preIdx = previewList.value.findIndex((url) => url === file.showPath);
  if (preIdx !== -1) {
    previewList.value.splice(preIdx, 1);
  }
  // 更新上传按钮的可用性
  uploadDisabled.value = fileList.value.length >= props.limit;
}

/* ***************************** 进度条 ********************************* */
const showProgress = ref<boolean>(false);
const progressPercent = ref<number>(0);
const progressStatus = ref<"" | "success" | "warning">("");
const progressWidth = ref<number>(40);
function progressOnStart() {
  showProgress.value = true;
  progressStatus.value = "";
  progressPercent.value = 0;
}
function progressOnChange(percent: number) {
  progressPercent.value = parseInt(percent.toFixed(0));
}
function progressOnSuccess() {
  progressStatus.value = "success";
  progressPercent.value = 100;
  setTimeout(() => {
    showProgress.value = false;
  }, 1000);
}
function progressOnError() {
  progressStatus.value = "warning";
  setTimeout(() => {
    showProgress.value = false;
  }, 1000);
}

/* ***************************** 暴露给父级的方法 ********************************* */
/**
 * 清理临时文件
 * @param clearTempFile 是否清理服务端临时文件
 */
const clear = (clearTempFile: boolean = true) => {
  // 1. 清理服务端临时文件
  if (clearTempFile) {
    const clearUploadCodes: string[] = fileList.value
      .filter((file) => file.uploadCode)
      .map((file) => file.uploadCode || "");
    if (clearUploadCodes.length > 0) {
      DfsAPI.clearTempFile({ uploadCodes: clearUploadCodes });
    }
  }
  // 2. 重置变量
  fileList.value = [];
  previewList.value = [];
};

/**
 * 获取文件列表
 */
const getFileList = (): UploadFileDto[] => {
  return fileList.value.map((file) => {
    return {
      id: file.fileId,
      fileName: file.name,

      fileMd5: file.fileMd5,
      fileSize: file.fileSize,
      fileType: file.fileType,
      filePath: file.filePath,
      showPath: file.showPath,
      uploadCode: file.uploadCode,
    } as UploadFileDto;
  });
};

/**
 * 设置文件列表
 */
const setFileList = (list: UploadFileDto[]) => {
  if (!list || list.length === 0) {
    fileList.value = [];
    previewList.value = [];
    return;
  }
  // 有值
  fileList.value = list.map((file) => {
    const temp = Object.assign({}, file) as unknown as UploadFileInfo;
    temp.url = file.showPath;
    temp.name = file.fileName || "";
    temp.fileId = file.id;
    temp.isPicture = FileUtil.isPicture("", temp.filePath);
    return temp;
  });
  previewList.value = fileList.value
    .filter((file) => file.isPicture)
    .map((file) => file.showPath || "");
};

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
const handlePreviewDown = (index: number) => {
  const fileUrl = fileList.value[index].showPath;
  window.open(fileUrl);
};

/**
 * 关闭预览
 */
const handlePreviewClose = () => {
  previewVisible.value = false;
};

/* ***************************** 监听器等（需放在最后） ********************************* */
// 监听属性变化
// watch(
// );
/**
 * 页面加载时
 */
onMounted(() => {});
/**
 * 暴露给父级组件的方法
 */
defineExpose({
  clear,
  getFileList,
  setFileList,
});
</script>
<style lang="scss" scoped>
:deep(.el-upload--picture-card),
:deep(.el-upload-list__item) {
  width: v-bind("props.style.width");
  height: v-bind("props.style.height");
}
:deep(.el-upload--picture-card) {
  margin: 0 8px 8px 0;
}
:deep(.el-upload-list__item) {
  line-height: initial;
  .el-upload-list__item-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .el-upload-list__item-name {
    display: inline;
  }
}
:deep(.el-upload-list--picture-card) {
  // .el-upload-list__item {
  //   line-height: initial;
  // }
  // .el-upload-list__item.is-ready {
  //   justify-content: center;
  // }
  .el-progress {
    width: v-bind("progressWidth");
  }
}
</style>
