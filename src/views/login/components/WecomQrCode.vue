<template>
  <div class="wecom-qr">
    <div class="qr-wrapper">
      <!-- 二维码容器 -->
      <div class="qr-box" :class="{ expired: isExpired }">
        <!-- 企业微信登录面板挂载点（ww.createWWLoginPanel 会在此注入 iframe） -->
        <div :id="CONTAINER_ID" class="qr-frame" />

        <!-- 加载遮罩 -->
        <div v-if="loading" class="qr-overlay">
          <el-icon class="is-loading" size="32"><Loading /></el-icon>
        </div>

        <!-- 过期/错误遮罩 -->
        <Transition name="fade">
          <div v-if="isExpired" class="qr-overlay qr-expired-mask" @click="refresh">
            <el-icon size="28"><RefreshRight /></el-icon>
            <span>{{ t("login.qrExpired") }}</span>
            <span class="qr-expired-mask__sub">{{ t("login.clickRefresh") }}</span>
          </div>
        </Transition>
      </div>
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
import { Loading, RefreshRight } from "@element-plus/icons-vue";
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
const SCENE = "wecom";
// 二维码本地有效期（秒），超时后重新拉取配置生成新面板
const QR_TTL = 300;
// 企业微信登录面板挂载点 id
const CONTAINER_ID = "ww-login-container";
// 企业微信 JS-SDK 2.0（提供 ww.createWWLoginPanel），版本可按需升级
const WECOM_JSSDK = "https://wwcdn.weixin.qq.com/node/wework/wwopen/js/wecom-jssdk-2.4.0.js";

const loading = ref(true);
const isExpired = ref(false);

// ww.createWWLoginPanel 返回的面板实例（含 unmount 方法）
let panel: { el?: HTMLIFrameElement; unmount?: () => void } | null = null;
let expireTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (expireTimer) {
    clearTimeout(expireTimer);
    expireTimer = null;
  }
}

function unmountPanel() {
  try {
    panel?.unmount?.();
  } catch {
    // ignore
  }
  panel = null;
}

/* ***************************** 加载企业微信 JS-SDK ********************************* */
let sdkPromise: Promise<void> | null = null;
function loadWecomSdk(): Promise<void> {
  if ((window as any).ww?.createWWLoginPanel) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WECOM_JSSDK;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("企业微信 JS-SDK 加载失败"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/* ***************************** 渲染登录面板 ********************************* */
async function renderPanel(cfg: CredentialConfigDto) {
  await loadWecomSdk();
  await nextTick();
  // 清空容器，避免重复渲染叠加
  const el = document.getElementById(CONTAINER_ID);
  if (el) el.innerHTML = "";

  const ww = (window as any).ww;
  panel = ww.createWWLoginPanel({
    el: `#${CONTAINER_ID}`,
    params: {
      login_type: "CorpApp", // 企业自建应用登录
      appid: cfg.appid || "", // 企业 corpid
      agentid: cfg.agentId || "", // 自建应用 agentid
      redirect_uri: cfg.redirectUri || "", // 由后端配置，SDK 内部会做编码
      state: cfg.state || "",
      redirect_type: "callback", // 回调模式：扫码成功后通过 onLoginSuccess 返回 code，不跳转页面
      panel_size: "small", // 320x380px
    },
    onLoginSuccess: ({ code }: { code: string }) => {
      clearTimers();
      doCredentialLogin(code);
    },
    onLoginFail: () => {
      // 登录失败，标记失效允许重试
      isExpired.value = true;
      clearTimers();
    },
    onCheckWeComLogin: () => {
      // 桌面端企业微信登录态回调，暂不处理
    },
  });
}

/* ***************************** 主流程 ********************************* */
/**
 * 1. 获取企业微信配置 → 2/3. 加载 SDK 并渲染登录面板 → 等待 onLoginSuccess 回调
 */
async function loadPanel() {
  clearTimers();
  unmountPanel();
  loading.value = true;
  isExpired.value = false;
  try {
    const cfg = await AuthAPI.credentialConfig({ scene: SCENE });
    await renderPanel(cfg);
    loading.value = false;
    // 超时标记失效
    expireTimer = setTimeout(() => {
      isExpired.value = true;
    }, QR_TTL * 1000);
  } catch {
    loading.value = false;
    isExpired.value = true; // 失败也允许点击重试
  }
}

/**
 * 拿到 code 后按统一登录流程调用 credentialLogin
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
    // 登录失败，重新生成面板
    refresh();
  }
}

/**
 * 二维码超时/失败后重新拉取配置并生成新面板
 */
function refresh() {
  loadPanel();
}

onMounted(() => {
  loadPanel();
});

onUnmounted(() => {
  clearTimers();
  unmountPanel();
});
</script>

<style lang="scss" scoped>
.wecom-qr {
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
  height: 320px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 300px;

  // 企业微信面板注入的 iframe 居中显示
  :deep(iframe) {
    display: block;
    margin: 0 auto;
    border: 0;
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
  border-radius: 12px;
  backdrop-filter: blur(4px);
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
