<template>
  <el-dialog
    :model-value="visible"
    title="MFA 验证"
    width="400px"
    :close-on-click-modal="true"
    @close="handleClose"
  >
    <el-form ref="mfaFormRef" :model="formData" :rules="rules">
      <el-form-item prop="totpCode">
        <el-input
          v-model="totpCode"
          placeholder="请输入 6 位动态验证码"
          maxlength="6"
          @input="handleInput"
          @keyup.enter="handleSubmit"
        />
      </el-form-item>
      <el-text v-if="errorMsg" type="danger">{{ errorMsg }}</el-text>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">验证</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import AuthAPI from "@/api/auth";
import { useUserStore } from "@/stores";

/* ***************************** 参数定义 ********************************* */
const props = defineProps<{
  visible: boolean;
  tempToken: string;
}>();

const emits = defineEmits<{
  "update:visible": [value: boolean];
  "mfa-success": [];
}>();

const userStore = useUserStore();

/* ***************************** 内部状态 ********************************* */
const totpCode = ref<string>("");
const loading = ref<boolean>(false);
const errorMsg = ref<string>("");

const formData = computed(() => ({
  totpCode: totpCode.value,
}));

const rules = {
  totpCode: [
    { required: true, message: "请输入动态验证码", trigger: "blur" },
    { pattern: /^\d{6}$/, message: "请输入 6 位数字验证码", trigger: "blur" },
  ],
};

const mfaFormRef = ref();

/* ***************************** 方法定义 ********************************* */
/** 输入过滤 - 仅允许数字，过滤非数字字符 */
function handleInput(value: string) {
  totpCode.value = value.replace(/\D/g, "");
}

/** 提交验证 */
async function handleSubmit() {
  // 表单校验
  try {
    await mfaFormRef.value.validate();
  } catch {
    return;
  }
  // 防止重复提交
  loading.value = true;
  try {
    const data = await AuthAPI.mfaLogin({ tempToken: props.tempToken, totpCode: totpCode.value });
    // 成功：保存用户信息并通知父组件
    userStore.setUserInfo(data);
    // emits("update:visible", false);
    emits("mfa-success");
  } catch (error: any) {
    // 失败：显示错误信息，清空输入，恢复按钮
    totpCode.value = "";
    errorMsg.value = error;
    loading.value = false;
  }
}

/** 关闭弹窗 */
function handleClose() {
  emits("update:visible", false);
  totpCode.value = "";
  errorMsg.value = "";
  loading.value = false;
}

/* ***************************** 侦听器 ********************************* */
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      totpCode.value = "";
      errorMsg.value = "";
      loading.value = false;
    }
  }
);
</script>
