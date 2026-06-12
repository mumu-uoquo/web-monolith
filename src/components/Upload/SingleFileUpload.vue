<!-- 单图上传组件 -->
<template>
  <el-upload
    v-model="currentFile"
    class="single-upload"
    list-type="picture-card"
    :show-file-list="false"
    :accept="props.accept"
    :before-upload="handleBeforeUpload"
    :http-request="handleUpload"
    :on-success="onSuccess"
    :on-error="onError"
  >
    <template #default>
      <div v-if="currentFile.name" class="el-upload-thumbnail">
        <!-- 图片预览（非图片时展现名称）-->
        <el-image
          v-if="currentFile.isPicture"
          :src="currentFile.showPath"
          fit="contain"
          class="el-upload-thumbnail__image"
        >
          <template #error>
            <el-text class="el-upload-thumbnail__name">{{ currentFile.name }}</el-text>
          </template>
        </el-image>
        <el-text v-else class="el-upload-thumbnail__name">{{ currentFile.name }}</el-text>
        <!-- 删除按钮 -->
        <el-icon class="single-upload__delete-btn" @click.stop="handleDelete">
          <CircleCloseFilled />
        </el-icon>
      </div>
      <div v-else style="line-height: normal">
        <!-- 新增按钮或进度环 -->
        <el-progress
          v-if="showProgress"
          :percentage="progressPercent"
          :status="progressStatus"
          :show-text="false"
          :width="40"
          type="circle"
        />
        <el-icon v-else class="single-upload__add-btn"><Plus /></el-icon>
      </div>
      <!-- 还原按钮 -->
      <el-icon
        v-if="currentFile.uploadCode || currentFile.fileId != initFile.fileId"
        class="single-upload__undo-btn"
        @click.stop="handleUndo"
      >
        <RefreshLeft />
      </el-icon>
    </template>
  </el-upload>
</template>

<script setup lang="ts">
import { Plus, CircleCloseFilled, RefreshLeft } from "@element-plus/icons-vue";
import { UploadRawFile, UploadRequestOptions, UploadUserFile } from "element-plus";
import DfsAPI, { UploadFileDto } from "@/api/dfs";
import FileUtil from "@/utils/file";

/* ***************************** 参数定义 ********************************* */
// 暴露给父级的自定义事件
// const emits = defineEmits(["on-delete"]);
// 暴露给父级的自定义属性
const props = defineProps({
  /**
   * 请求携带的额外参数
   */
  data: {
    type: Object as PropType<Record<string, any>>,
    default: () => {
      return {};
    },
  },
  /**
   * 最大文件大小（单位：M）
   */
  maxFileSize: {
    type: Number,
    default: 5,
  },
  /**
   * 上传文件类型
   * 默认为所有图片格式“image/*"，可指定，如：'.png,.jpg,.jpeg,.gif,.bmp'
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
        width: "150px",
        height: "150px",
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

/* ***************************** 上传处理 ********************************* */
// 当前上传的文件信息
const currentFile = ref<UploadFileInfo>({ filePath: "", name: "" });
// 初始值
const initFile = ref<UploadFileInfo>({ filePath: "", name: "" });

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
  // 3. 有历史数据，则删除历史数据
  if (currentFile.value.uploadCode) {
    DfsAPI.clearTempFile({ uploadCodes: [currentFile.value.uploadCode] });
  }
  return true;
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
      { fileName: file.name, fileContent: "", finalFile: true },
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
 * @param fileInfo 上传成功后的文件信息
 * @param uploadFile 选择的上传文件信息
 */
const onSuccess = (fileInfo: UploadFileDto, uploadFile: UploadUserFile) => {
  ElMessage.success("上传成功");
  currentFile.value = Object.assign(fileInfo, uploadFile);
  currentFile.value.isPicture = FileUtil.isPicture(uploadFile.raw!.type, uploadFile.name);
};

/**
 * 上传失败回调
 */
const onError = (error: any) => {
  console.log("onError", error);
  // ElMessage.error("上传失败: " + error.message);
};

/**
 * 删除文件
 */
function handleDelete() {
  if (!currentFile.value || !currentFile.value.uploadCode) {
    currentFile.value = { filePath: "", name: "" };
    return;
  }
  DfsAPI.clearTempFile({ uploadCodes: [currentFile.value.uploadCode] }).finally(() => {
    currentFile.value = { filePath: "", name: "" };
  });
}

/**
 * 还原文件
 */
function handleUndo() {
  // console.log("handleUndo", initFile.value, currentFile.value);
  if (!currentFile.value || !currentFile.value.uploadCode) {
    currentFile.value = Object.assign({ name: "" }, initFile.value);
    return;
  }
  DfsAPI.clearTempFile({ uploadCodes: [currentFile.value.uploadCode] }).finally(() => {
    currentFile.value = Object.assign({}, initFile.value);
  });
}

/* ***************************** 进度条 ********************************* */
const showProgress = ref<boolean>(false);
const progressPercent = ref<number>(0);
const progressStatus = ref<"" | "success" | "warning">("");
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
    if (currentFile.value.uploadCode) {
      DfsAPI.clearTempFile({ uploadCodes: [currentFile.value.uploadCode] });
    }
  }
  // 2. 重置变量
  currentFile.value = { filePath: "", name: "" };
};

/**
 * 获取文件列表
 */
const getFile = (): UploadFileDto => {
  if (!currentFile.value) {
    return {} as UploadFileDto;
  }
  return {
    id: currentFile.value.fileId,
    fileName: currentFile.value.name,

    fileMd5: currentFile.value.fileMd5,
    fileSize: currentFile.value.fileSize,
    fileType: currentFile.value.fileType,
    filePath: currentFile.value.filePath,
    showPath: currentFile.value.showPath,
    uploadCode: currentFile.value.uploadCode,
  } as UploadFileDto;
};

/**
 * 设置文件列表
 */
const setFile = (file: UploadFileDto) => {
  const temp = Object.assign({}, file) as unknown as UploadFileInfo;
  if (file) {
    temp.url = file!.showPath;
    temp.name = file!.fileName || "";
    temp.fileId = file.id;
    temp.isPicture = FileUtil.isPicture("", temp.filePath);
  }
  initFile.value = Object.assign({}, temp);
  currentFile.value = temp;
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
  getFile,
  setFile,
});
</script>

<style scoped lang="scss">
:deep(.el-upload--picture-card),
:deep(.el-upload-thumbnail) {
  width: v-bind("props.style.width");
  height: v-bind("props.style.height");
}

.el-upload-thumbnail {
  line-height: initial;
  &__image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  &__name {
    display: inline-block;
    padding-top: 18px;
  }
}

.single-upload {
  position: relative;
  margin: 0 8px 8px 0;
  overflow: hidden;
  cursor: pointer;
  border: 1px var(--el-border-color) solid;
  border-radius: 5px;

  &:hover {
    border-color: var(--el-color-primary);
  }

  &__undo-btn,
  &__delete-btn {
    position: absolute;
    top: 1px;
    font-size: 16px;
    color: #ff7901;
    cursor: pointer;
    background: #fff;
    border-radius: 100%;

    :hover {
      color: #ff4500;
    }
  }

  &__undo-btn {
    left: 1px;
  }

  &__delete-btn {
    right: 1px;
  }
}
.single-upload__add-btn {
  font-size: 28px;
  color: var(--el-text-color-secondary);
}
</style>
