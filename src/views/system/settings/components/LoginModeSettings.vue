<template>
  <div v-loading="loading">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <!-- ───────────── 登录方式选择 ───────────── -->
      <el-form-item label="常规登录">
        <el-checkbox-group
          v-model="normalModes"
          class="login-mode-group"
          @change="handleNormalModesChange"
        >
          <el-checkbox value="password" disabled>账号密码</el-checkbox>
          <el-checkbox value="sms">手机短信</el-checkbox>
          <el-checkbox value="wechat">
            微信扫码
            <el-tooltip content="需要服务器能访问 https://api.weixin.qq.com" placement="top">
              <el-icon class="mode-tip-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </el-checkbox>
          <el-checkbox value="wecom">
            企微扫码
            <el-tooltip content="需要服务器能访问 https://qyapi.weixin.qq.com" placement="top">
              <el-icon class="mode-tip-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item label="紧急登录">
        <div class="emergency-modes">
          <div class="emergency-mode-item">
            <el-checkbox v-model="form.mfaEnable" @change="handleMfaChange">
              MFA认证
              <el-tooltip content="用户需要开启并绑定了MFA功能" placement="top">
                <el-icon class="mode-tip-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </el-checkbox>
            <el-alert
              v-if="form.mfaEnable"
              class="emergency-mode-alert"
              type="warning"
              show-icon
              :closable="false"
              title="仅通过账号和 MFA 验证码校验，存在被破解的风险，请谨慎开启。"
            />
          </div>
          <div class="emergency-mode-item">
            <el-checkbox v-model="form.offlineEnable" @change="handleOfflineChange">
              离线扫码
              <el-tooltip content="用户的手机号需要与企微中的手机号一致" placement="top">
                <el-icon class="mode-tip-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </el-checkbox>
            <el-alert
              v-if="form.offlineEnable"
              class="emergency-mode-alert"
              type="warning"
              show-icon
              :closable="false"
              title="通过企业微信在手机端展示基于“时间因子”的动态码，存在被破解的风险，请谨慎开启。"
            />
          </div>
        </div>
      </el-form-item>

      <!-- ───────────── 具体配置 ───────────── -->
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
          <el-input v-model="form.smsAppSecret" placeholder="请输入 AppSecret" />
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
          <el-input v-model="form.wechatAppSecret" placeholder="请输入 AppSecret" />
        </el-form-item>
        <el-form-item label="回调地址" prop="wechatCallbackUrl">
          <el-input
            v-model="form.wechatCallbackUrl"
            placeholder="请输入回调地址，如 https://example.com/callback"
          />
        </el-form-item>
      </template>

      <!-- WeCom Config (企微扫码 / 离线扫码 共用) -->
      <template v-if="showWecomConfig">
        <el-divider content-position="left">企业微信配置</el-divider>
        <el-form-item label="CorpID" prop="wecomCorpId">
          <el-input v-model="form.wecomCorpId" placeholder="请输入企业 CorpID" />
        </el-form-item>
        <el-form-item label="AgentID" prop="wecomAgentId">
          <el-input v-model="form.wecomAgentId" placeholder="请输入应用 AgentID" />
        </el-form-item>
        <el-form-item label="Secret" prop="wecomSecret">
          <el-input v-model="form.wecomSecret" placeholder="请输入应用 Secret" />
        </el-form-item>
        <el-form-item label="回调地址" prop="wecomRedirectUri">
          <el-input
            v-model="form.wecomRedirectUri"
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
import { reactive, ref, computed, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { InfoFilled } from "@element-plus/icons-vue";
import type { FormInstance, FormRules } from "element-plus";
import SystemAPI from "@/api/system";
import type { SettingSaveParam, SettingDto } from "@/api/system";
import { decrypt } from "@/utils/crypto";

/**
 * 对配置项的 configValue 做 taes 解密
 * - 空值直接返回原值
 * - 解密失败时降级返回原文
 */
function decryptSettings(settings: SettingDto[]): SettingDto[] {
  return settings.map((item) => {
    if (!item.configValue) return item;
    try {
      return { ...item, configValue: decrypt.taes(item.configValue) || item.configValue };
    } catch {
      return item;
    }
  });
}

interface LoginModeForm {
  // 常规登录
  passwordEnable: boolean;
  smsEnable: boolean;
  wechatEnable: boolean;
  wecomEnable: boolean;
  // 手机短信配置
  smsPlatform: string;
  smsAppId: string;
  smsAppSecret: string;
  smsSign: string;
  smsTemplateId: string;
  // 微信扫码配置
  wechatAppId: string;
  wechatAppSecret: string;
  wechatCallbackUrl: string;
  // 企业微信配置
  wecomCorpId: string;
  wecomAgentId: string;
  wecomSecret: string;
  wecomRedirectUri: string;
  // 紧急登录
  mfaEnable: boolean;
  offlineEnable: boolean;
}

const CONFIG_MAP: Record<
  string,
  {
    field: keyof LoginModeForm;
    fromValue: (v: string | undefined) => any;
    toValue: (v: any) => string;
  }
> = {
  "login.password.enabled": {
    field: "passwordEnable",
    fromValue: (v) => v !== "false",
    toValue: (v) => String(v),
  },
  "login.sms.enabled": {
    field: "smsEnable",
    fromValue: (v) => v !== "false",
    toValue: (v) => String(v),
  },
  "login.wechat.enabled": {
    field: "wechatEnable",
    fromValue: (v) => v !== "false",
    toValue: (v) => String(v),
  },
  "login.wecom.enabled": {
    field: "wecomEnable",
    fromValue: (v) => v === "true",
    toValue: (v) => String(v),
  },
  "login.mfa.enabled": {
    field: "mfaEnable",
    fromValue: (v) => v === "true",
    toValue: (v) => String(v),
  },
  "login.offline.enabled": {
    field: "offlineEnable",
    fromValue: (v) => v === "true",
    toValue: (v) => String(v),
  },
  "login.sms.platform": {
    field: "smsPlatform",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.sms.appid": {
    field: "smsAppId",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.sms.secret": {
    field: "smsAppSecret",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.sms.sign": {
    field: "smsSign",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.sms.template": {
    field: "smsTemplateId",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wechat.appid": {
    field: "wechatAppId",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wechat.secret": {
    field: "wechatAppSecret",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wechat.redirect-uri": {
    field: "wechatCallbackUrl",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wecom.corpid": {
    field: "wecomCorpId",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wecom.agentid": {
    field: "wecomAgentId",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wecom.secret": {
    field: "wecomSecret",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
  "login.wecom.redirect-uri": {
    field: "wecomRedirectUri",
    fromValue: (v) => v ?? "",
    toValue: (v) => v,
  },
};

const form = reactive<LoginModeForm>({
  passwordEnable: true,
  smsEnable: false,
  wechatEnable: false,
  wecomEnable: false,
  smsPlatform: "",
  smsAppId: "",
  smsAppSecret: "",
  smsSign: "",
  smsTemplateId: "",
  wechatAppId: "",
  wechatAppSecret: "",
  wechatCallbackUrl: "",
  wecomCorpId: "",
  wecomAgentId: "",
  wecomSecret: "",
  wecomRedirectUri: "",
  mfaEnable: false,
  offlineEnable: false,
});

// 企业微信配置在「企微扫码」或「离线扫码」任一开启时显示
const showWecomConfig = computed(() => form.wecomEnable || form.offlineEnable);

function buildNormalModes(): string[] {
  const modes: string[] = ["password"];
  if (form.smsEnable) modes.push("sms");
  if (form.wechatEnable) modes.push("wechat");
  if (form.wecomEnable) modes.push("wecom");
  return modes;
}

const normalModes = ref<string[]>(buildNormalModes());

// 常规登录：同步选项 → form 布尔字段（账号密码强制开启）
watch(
  normalModes,
  (val) => {
    form.passwordEnable = true;
    form.smsEnable = val.includes("sms");
    form.wechatEnable = val.includes("wechat");
    form.wecomEnable = val.includes("wecom");
  },
  { deep: true }
);

function handleNormalModesChange(val: (string | number | boolean)[]) {
  const strVal = val as string[];
  // 账号密码默认选中且不可取消
  if (!strVal.includes("password")) {
    normalModes.value = ["password", ...strVal.filter((v) => v !== "password")];
  }
}

// 紧急登录：仅对刚勾选的项进行风险提示
function handleMfaChange(val: string | number | boolean) {
  if (val) {
    ElMessage.warning("MFA认证存在被破解的风险，请谨慎开启");
  }
}

function handleOfflineChange(val: string | number | boolean) {
  if (val) {
    ElMessage.warning("离线扫码基于“时间因子”的动态码，存在被破解的风险，请谨慎开启");
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
  wecomCorpId: [
    {
      validator: (_rule, value, callback) => {
        if (showWecomConfig.value && (!value || value.trim() === "")) {
          callback(new Error("CorpID 不能为空"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  wecomAgentId: [
    {
      validator: (_rule, value, callback) => {
        if (showWecomConfig.value && (!value || value.trim() === "")) {
          callback(new Error("AgentID 不能为空"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  wecomSecret: [
    {
      validator: (_rule, value, callback) => {
        if (showWecomConfig.value && (!value || value.trim() === "")) {
          callback(new Error("Secret 不能为空"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  wecomRedirectUri: [
    {
      validator: (_rule, value, callback) => {
        if (showWecomConfig.value) {
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
  // 后台返回的 configCode 可能存在大小写差异，做不区分大小写的匹配
  const mapByLowerCode = new Map(
    Object.entries(CONFIG_MAP).map(([code, mapping]) => [code.toLowerCase(), mapping])
  );
  for (const item of settings) {
    const mapping = mapByLowerCode.get(item.configCode?.toLowerCase());
    if (mapping) {
      (form as any)[mapping.field] = mapping.fromValue(item.configValue);
    }
  }
  // 账号密码强制开启
  form.passwordEnable = true;
  // 数据回填后同步选项
  normalModes.value = buildNormalModes();
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
    settingsToForm(decryptSettings(data));
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

.mode-tip-icon {
  margin-left: 2px;
  vertical-align: middle;
  color: var(--el-color-info);
  cursor: help;
}

.emergency-modes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.emergency-mode-item {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 32px;
}

.emergency-mode-alert {
  flex: 1;
}

.emergency-mode-alert :deep(.el-alert) {
  padding-top: 4px;
  padding-bottom: 4px;
}

/* el-alert 自身就是根元素时，直接作用于它 */
.emergency-mode-alert.el-alert {
  padding-top: 4px;
  padding-bottom: 4px;
}
</style>
