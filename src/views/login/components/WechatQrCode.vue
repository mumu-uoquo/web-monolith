<template>
  <div class="wechat-qr">
    <h3 class="login-form__title text-center">{{ t("login.wechatLogin") }}</h3>

    <div class="qr-wrapper">
      <!-- 二维码容器 -->
      <div class="qr-box" :class="{ expired: isExpired }">
        <!-- 微信 WxLogin 二维码挂载点（始终存在，便于 WxLogin 渲染 iframe） -->
        <div :id="CONTAINER_ID" class="qr-frame" />

        <!-- 加载遮罩 -->
        <div v-if="loading" class="qr-overlay">
          <el-icon class="is-loading" size="32"><Loading /></el-icon>
        </div>

        <!-- 过期遮罩 -->
        <Transition name="fade">
          <div v-if="isExpired" class="qr-overlay qr-expired-mask" @click="refresh">
            <el-icon size="28"><RefreshRight /></el-icon>
            <span>{{ t("login.qrExpired") }}</span>
            <span class="qr-expired-mask__sub">{{ t("login.clickRefresh") }}</span>
          </div>
        </Transition>
      </div>

      <!-- 状态提示 -->
      <div class="qr-status">
        <template v-if="isExpired">
          <el-icon size="14" color="var(--el-color-danger)"><CircleCloseFilled /></el-icon>
          <el-text type="danger" size="small">{{ t("login.qrExpired") }}</el-text>
        </template>
        <template v-else-if="scanStatus === 'confirmed'">
          <el-icon size="14" color="var(--el-color-success)"><SuccessFilled /></el-icon>
          <el-text type="success" size="small">{{ t("login.qrConfirmed") }}</el-text>
        </template>
        <template v-else>
          <el-icon size="14" color="var(--el-text-color-placeholder)"><Timer /></el-icon>
          <el-text type="info" size="small">{{ t("login.qrWaiting") }}</el-text>
        </template>
      </div>

      <el-text size="small" type="info" class="qr-guide">
        {{ t("login.wechatQrGuide") }}
      </el-text>
    </div>

    <!-- 返回账号登录 -->
    <div flex-center mt-8px>
      <el-link type="primary" underline="never" @click="$emit('update:modelValue', 'login')">
        {{ t("login.backToAccount") }}
      </el-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Loading,
  RefreshRight,
  Timer,
  SuccessFilled,
  CircleCloseFilled,
} from "@element-plus/icons-vue";
import { useUserStore } from "@/stores";
import { AuthStorage } from "@/utils/auth";
import { appConfig } from "@/settings";
import AuthAPI, { type CredentialConfigDto } from "@/api/auth";

const emits = defineEmits<{
  /** 登录成功 */
  (e: "on-submit"): void;
  /** 切换其他视图 */
  (e: "update:modelValue", value: string): void;
  /** 需要绑定账号（未找到关联账号），携带绑定用临时 token 和凭证类型 */
  (e: "need-bind", tempToken: string, provider: string): void;
  /** 需要 MFA 二次认证，携带临时 token */
  (e: "need-mfa", tempToken: string): void;
}>();

const { t } = useI18n();
const userStore = useUserStore();

// 凭证类型 / 场景
const SCENE = "wechat";
// 二维码本地有效期（秒），超时后重新拉取配置生成新码
const QR_TTL = 300;
// WxLogin 二维码挂载点 id
const CONTAINER_ID = "wx-login-container";
// 微信官方 JS（使用 https 避免 https 页面的混合内容拦截）
const WX_LOGIN_JS = "https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js";

const loading = ref(true);
const isExpired = ref(false);
const scanStatus = ref<"waiting" | "confirmed">("waiting");
const currentState = ref<string>(""); // 本次授权的 state，用于状态轮询

let pollTimer: ReturnType<typeof setInterval> | null = null;
let expireTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (expireTimer) {
    clearTimeout(expireTimer);
    expireTimer = null;
  }
}

/* ***************************** 加载微信 JS ********************************* */
let wxScriptPromise: Promise<void> | null = null;
function loadWxLoginScript(): Promise<void> {
  if ((window as any).WxLogin) return Promise.resolve();
  if (wxScriptPromise) return wxScriptPromise;
  wxScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WX_LOGIN_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      wxScriptPromise = null;
      reject(new Error("wxLogin.js 加载失败"));
    };
    document.head.appendChild(script);
  });
  return wxScriptPromise;
}

/* ***************************** 渲染二维码 ********************************* */
async function renderQrCode(cfg: CredentialConfigDto) {
  await loadWxLoginScript();
  await nextTick();
  // 清空容器，避免重复渲染叠加
  const el = document.getElementById(CONTAINER_ID);
  if (el) el.innerHTML = "";
  const isDark = document.documentElement.classList.contains("dark");

  new (window as any).WxLogin({
    self_redirect: true, // 在 iframe 内部回跳，不跳转整个页面
    id: CONTAINER_ID,
    appid: cfg.appid || "",
    scope: "snsapi_login,snsapi_base",
    redirect_uri: encodeURIComponent(cfg.redirectUri || ""),
    state: cfg.state || "",
    style: isDark ? "white" : "black",
    stylelite: 1,
  });
}

/* ***************************** 主流程 ********************************* */
/**
 * 1. 获取微信配置 → 2/3. 加载脚本并渲染二维码 → 4. 轮询扫码状态
 */
async function loadQrCode() {
  clearTimers();
  loading.value = true;
  isExpired.value = false;
  scanStatus.value = "waiting";
  try {
    const cfg = await AuthAPI.credentialConfig({ scene: SCENE });
    currentState.value = cfg.state || "";
    await renderQrCode(cfg);
    loading.value = false;
    // 6. 超时标记失效并停止轮询
    expireTimer = setTimeout(() => {
      isExpired.value = true;
      clearTimers();
    }, QR_TTL * 1000);
    // 4. 轮询扫码状态
    startPolling();
  } catch {
    loading.value = false;
    isExpired.value = true; // 失败也允许点击重试
  }
}

/**
 * 4. 轮询 credentialStatus 获取扫码后的 code
 */
function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const res = await AuthAPI.credentialStatus({ scene: SCENE, state: currentState.value });
      if (res.status === "confirmed" && res.code) {
        scanStatus.value = "confirmed";
        clearTimers();
        await doCredentialLogin(res.code);
      }
    } catch {
      // 忽略单次轮询错误，等待下一次
    }
  }, 2000);
}

/**
 * 5. 拿到 code 后按统一登录流程调用 credentialLogin
 */
async function doCredentialLogin(code: string) {
  try {
    const data = await AuthAPI.credentialLogin({
      credentialType: SCENE,
      credentialValue: code,
      rememberMe: AuthStorage.getRememberMe(),
      appVersion: appConfig.version,
    });
    if (data.totpStatus === "enabled") {
      // 开启双因子认证，accessToken 即为 MFA 临时 token
      emits("need-mfa", data.accessToken || "");
    } else if (!data.id) {
      // 未找到关联账号，accessToken 作为绑定用临时 token
      emits("need-bind", data.accessToken || "", SCENE);
    } else {
      userStore.setUserInfo(data);
      emits("on-submit");
    }
  } catch {
    // 登录失败，重新生成二维码
    refresh();
  }
}

/**
 * 6. 二维码超时/失败后重新拉取配置并生成新码
 */
function refresh() {
  loadQrCode();
}

onMounted(() => {
  loadQrCode();
});

onUnmounted(() => {
  clearTimers();
});
</script>

<style lang="scss" scoped>
.wechat-qr {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qr-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.qr-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 190px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  transition: border-color 0.3s;

  &.expired {
    border-color: var(--el-color-danger-light-5);
  }
}

.qr-frame {
  // 微信二维码在 iframe 内靠顶部排版，下移此偏移量使其在窗口内垂直居中（可按需微调）
  --wx-qr-offset: 14px;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  height: 190px;
  overflow: hidden;

  // WxLogin 注入的 iframe：限制高度为 190px，并向下偏移使二维码垂直居中
  :deep(iframe) {
    display: block;
    width: 100%;
    height: 190px !important;
    margin-top: var(--wx-qr-offset);
  }
}

.qr-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color-blank);
}

.qr-expired-mask {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  background: rgb(0 0 0 / 60%);
  backdrop-filter: blur(4px);
  border-radius: 12px;
  transition: background 0.2s;

  &:hover {
    background: rgb(0 0 0 / 72%);
  }

  &__sub {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.8;
  }
}

.qr-status {
  display: flex;
  gap: 4px;
  align-items: center;
}

.qr-guide {
  text-align: center;
  white-space: pre-wrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
