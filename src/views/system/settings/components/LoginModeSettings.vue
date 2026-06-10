<template>
  <div v-loading="loading">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="登录方式">
        <el-checkbox-group
          v-model="enabledModes"
          class="login-mode-group"
          @change="handleModesChange"
        >
          <el-checkbox label="password">账号密码</el-checkbox>
          <el-checkbox label="sms">手机短信</el-checkbox>
          <el-checkbox label="wechat">微信扫码</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <!-- SMS Config -->
      <template v-if="form.smsEnable">
        <el-divider content-position="left">手机短信配置</el-divider>
        <el-form-item label="平台类型" prop="smsPlatform">
          <el-select v-model="form.smsPlatform" placeholder="请选择平台类型">
            <el-option label="阿里云" value="aliyun" />
            <el-option label="腾讯云" value="tencent" />
            <el-option label="华为云" value="huawei" />
          </el-select>
        </el-form-item>
        <el-form-item label="AppID" prop="smsAppId">
          <el-input v-model="form.smsAppId" placeholder="请输入 AppID" />
        </el-form-item>
        <el-form-item label="AppSecret" prop="smsAppSecret">
          <el-input
            v-model="form.smsAppSecret"
            type="password"
            show-password
            placeholder="请输入 AppSecret"
          />
        </el-form-item>
        <el-form-item label="签名" prop="smsSign">
          <el-input v-model="form.smsSign" placeholder="请输入签名" />
        </el-form-item>
        <el-form-item label="模板ID" prop="smsTemplateId">
          <el-input v-model="form.smsTemplateId" placeholder="请输入模板ID" />
        </el-form-item>
      </template>

      <!-- WeChat Config -->
      <template v-if="form.wechatEnable">
        <el-divider content-position="left">微信扫码配置</el-divider>
        <el-form-item label="AppID" prop="wechatAppId">
          <el-input v-model="form.wechatAppId" placeholder="请输入 AppID" />
        </el-form-item>
        <el-form-item label="AppSecret" prop="wechatAppSecret">
          <el-input
            v-model="form.wechatAppSecret"
            type="password"
            show-password
            placeholder="请输入 AppSecret"
          />
        </el-form-item>
        <el-form-item label="回调地址" prop="wechatCallbackUrl">
          <el-input
            v-model="form.wechatCallbackUrl"
            placeholder="请输入回调地址，如 https://example.com/callback"
          />
        </el-form-item>
      </template>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import SystemAPI from "@/api/system";
import type { SettingSaveParam, SettingDto } from "@/api/system";

interface LoginModeForm {
  passwordEnable: boolean;
  smsEnable: boolean;
  wechatEnable: boolean;
  smsPlatform: string;
  smsAppId: string;
  smsAppSecret: string;
  smsSign: string;
  smsTemplateId: string;
  wechatAppId: string;
  wechatAppSecret: string;
  wechatCallbackUrl: string;
}

const CONFIG_MAP: Record<
  string,
  {
    field: keyof LoginModeForm;
    fromValue: (v: string | undefined) => any;
    toValue: (v: any) => string;
  }
> = {
  "login.password.enable": {
    field: "passwordEnable",
    fromValue: (v) => v !== "false",
    toValue: (v) => String(v),
  },
  "login.sms.enable": {
    field: "smsEnable",
    fromValue: (v) => v !== "false",
    toValue: (v) => String(v),
  },
  "login.wechat.enable": {
    field: "wechatEnable",
    fromValue: (v) => v !== "false",
    toValue: (v) => String(v),
  },
  "login.sms.platform": {
    field: "smsPlatform",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.sms.appId": {
    field: "smsAppId",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.sms.appSecret": {
    field: "smsAppSecret",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.sms.sign": {
    field: "smsSign",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.sms.templateId": {
    field: "smsTemplateId",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wechat.appId": {
    field: "wechatAppId",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wechat.appSecret": {
    field: "wechatAppSecret",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wechat.callbackUrl": {
    field: "wechatCallbackUrl",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
};

const form = reactive<LoginModeForm>({
  passwordEnable: true,
  smsEnable: false,
  wechatEnable: false,
  smsPlatform: "",
  smsAppId: "",
  smsAppSecret: "",
  smsSign: "",
  smsTemplateId: "",
  wechatAppId: "",
  wechatAppSecret: "",
  wechatCallbackUrl: "",
});

function buildEnabledModes(): string[] {
  const modes: string[] = [];
  if (form.passwordEnable) modes.push("password");
  if (form.smsEnable) modes.push("sms");
  if (form.wechatEnable) modes.push("wechat");
  return modes;
}

const enabledModes = ref<string[]>(buildEnabledModes());
let prevEnabledModes: string[] = [...enabledModes.value];

// Sync enabledModes → form boolean fields
watch(
  enabledModes,
  (val) => {
    form.passwordEnable = val.includes("password");
    form.smsEnable = val.includes("sms");
    form.wechatEnable = val.includes("wechat");
  },
  { deep: true }
);

function handleModesChange(val: (string | number | boolean)[]) {
  const strVal = val as string[];
  if (strVal.length === 0) {
    ElMessage.warning("至少需要保留一种登录方式");
    // Rollback
    enabledModes.value = [...prevEnabledModes];
  } else {
    prevEnabledModes = [...strVal];
  }
}

const formRef = ref<FormInstance>();
const loading = ref(false);
const saving = ref(false);

const rules: FormRules = {
  smsPlatform: [
    {
      validator: (_rule, value, callback) => {
        if (form.smsEnable && (!value || value.trim() === "")) {
          callback(new Error("平台类型不能为空"));
        } else {
          callback();
        }
      },
      trigger: "change",
    },
  ],
  smsAppId: [
    {
      validator: (_rule, value, callback) => {
        if (form.smsEnable && (!value || value.trim() === "")) {
          callback(new Error("AppID 不能为空"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  smsAppSecret: [
    {
      validator: (_rule, value, callback) => {
        if (form.smsEnable && (!value || value.trim() === "")) {
          callback(new Error("AppSecret 不能为空"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  smsSign: [
    {
      validator: (_rule, value, callback) => {
        if (form.smsEnable && (!value || value.trim() === "")) {
          callback(new Error("签名不能为空"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  smsTemplateId: [
    {
      validator: (_rule, value, callback) => {
        if (form.smsEnable && (!value || value.trim() === "")) {
          callback(new Error("模板ID 不能为空"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  wechatAppId: [
    {
      validator: (_rule, value, callback) => {
        if (form.wechatEnable && (!value || value.trim() === "")) {
          callback(new Error("AppID 不能为空"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  wechatAppSecret: [
    {
      validator: (_rule, value, callback) => {
        if (form.wechatEnable && (!value || value.trim() === "")) {
          callback(new Error("AppSecret 不能为空"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  wechatCallbackUrl: [
    {
      validator: (_rule, value, callback) => {
        if (form.wechatEnable) {
          if (!value || value.trim() === "") {
            callback(new Error("回调地址不能为空"));
          } else if (!/^https?:\/\//.test(value)) {
            callback(new Error("回调地址格式不正确"));
          } else {
            callback();
          }
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

function settingsToForm(settings: SettingDto[]) {
  for (const item of settings) {
    const mapping = CONFIG_MAP[item.configCode];
    if (mapping) {
      (form as any)[mapping.field] = mapping.fromValue(item.configValue);
    }
  }
  // Sync enabledModes after form is populated
  enabledModes.value = buildEnabledModes();
  prevEnabledModes = [...enabledModes.value];
}

function formToSettings(): SettingSaveParam[] {
  return Object.entries(CONFIG_MAP).map(([configCode, mapping]) => ({
    configCode,
    configValue: mapping.toValue((form as any)[mapping.field]),
  }));
}

async function handleSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      await SystemAPI.saveSystemSetting(formToSettings());
      ElMessage.success("保存成功");
    } catch {
      ElMessage.error("保存失败，请重试");
    } finally {
      saving.value = false;
    }
  });
}

onMounted(async () => {
  loading.value = true;
  try {
    const data = await SystemAPI.listSettingsByCode({ prefix: "login." });
    settingsToForm(data);
  } catch {
    ElMessage.error("加载配置失败，请刷新重试");
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.login-mode-group {
  display: flex;
  gap: 16px;
}
</style>
