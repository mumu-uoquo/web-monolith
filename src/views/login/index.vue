<template>
  <div class="login-page">
    <div class="login-page__toolbar">
      <el-tooltip :content="t('login.themeToggle')" placement="bottom">
        <div class="toolbar-item">
          <ThemeSwitch />
        </div>
      </el-tooltip>
      <el-tooltip :content="t('login.languageToggle')" placement="bottom">
        <div class="toolbar-item">
          <LangSelect size="text-20px" />
        </div>
      </el-tooltip>
    </div>

    <div class="login-page__body">
      <section class="login-hero">
        <Hero />
      </section>

      <section class="login-card">
        <div class="login-card__brand">
          <div class="login-card__logo-wrap">
            <el-image :src="logo" class="login-card__logo" />
          </div>
          <div class="login-card__meta">
            <div class="login-card__title-row">
              <span class="login-card__title">{{ appConfig.title }}</span>
            </div>
            <div v-if="appConfig.version || tenantEnabled" class="login-card__version-row">
              <el-text size="small" type="info">VERSION</el-text>
              <el-tag v-if="appConfig.version" size="small" effect="light" round>
                {{ `v${appConfig.version}` }}
              </el-tag>
              <el-tag v-if="tenantEnabled" type="success" size="small" effect="light" round>
                多租户
              </el-tag>
            </div>
          </div>
        </div>

        <transition name="fade-slide" mode="out-in">
          <!-- 账号密码登录 -->
          <div v-if="component === 'login'" key="login" class="login-card__form">
            <AccountForm
              @on-submit="handleLoginSuccess"
              @need-mfa="handleNeedMfa"
              @on-show-form="showForm"
            />
          </div>

          <!-- MFA 双因子认证 -->
          <div v-else-if="component === 'mfa'" key="mfa" class="login-card__form">
            <MfaForm :temp-token="mfaTempToken" @mfa-success="handleLoginSuccess" />
          </div>

          <!-- 微信扫码 -->
          <div v-else-if="component === 'wechat'" key="wechat" class="login-card__form">
            <WechatQrCode
              @update:model-value="component = $event"
              @on-submit="handleLoginSuccess"
              @need-bind="handleNeedBind"
              @need-mfa="handleNeedMfa"
            />
          </div>

          <!-- 手机号登录 -->
          <div v-else-if="component === 'phone'" key="phone" class="login-card__form">
            <PhoneForm
              @update:model-value="component = $event"
              @on-submit="handleLoginSuccess"
              @need-mfa="handleNeedMfa"
            />
          </div>

          <!-- 第三方登录首次绑定账号 -->
          <div v-else-if="component === 'bind'" key="bind" class="login-card__form">
            <BindForm
              :temp-token="bindCredential"
              :provider="bindProvider"
              @update:model-value="component = $event"
              @on-submit="handleLoginSuccess"
              @need-mfa="handleNeedMfa"
            />
          </div>

          <!-- 注册 -->
          <div v-else-if="component === 'register'" key="register" class="login-card__form">
            <Register @update:model-value="component = $event" />
          </div>
          <!-- 重置密码 -->
          <div v-else-if="component === 'resetPwd'" key="resetPwd" class="login-card__form">
            <ResetPwd @update:model-value="component = $event" />
          </div>
        </transition>

        <!-- 第三方登录（仅在 login / phone / wechat 模式下显示） -->
        <div
          v-if="['login', 'phone', 'mfa', 'wechat', 'bind'].includes(component)"
          class="login-form__social"
        >
          <div class="social-divider">
            <span class="social-divider__line" />
            <span class="social-divider__text">{{ t("login.otherLoginMethods") }}</span>
            <span class="social-divider__line" />
          </div>
          <div class="social-icons">
            <el-tooltip :content="t('login.wechatLogin')" placement="top">
              <span
                class="social-icons__item"
                :class="{ active: component === 'wechat' }"
                @click="component = component === 'wechat' ? 'login' : 'wechat'"
              >
                <span class="i-svg:site-wechat" />
              </span>
            </el-tooltip>
            <el-tooltip :content="t('login.phoneLogin')" placement="top">
              <span
                class="social-icons__item"
                :class="{ active: component === 'phone' }"
                @click="component = component === 'phone' ? 'login' : 'phone'"
              >
                <el-icon><Iphone /></el-icon>
              </span>
            </el-tooltip>
            <el-tooltip content="QQ" placement="top">
              <span class="social-icons__item"><span class="i-svg:site-qq" /></span>
            </el-tooltip>
            <el-tooltip content="GitHub" placement="top">
              <span class="social-icons__item"><span class="i-svg:site-github" /></span>
            </el-tooltip>
            <el-tooltip content="Gitee" placement="top">
              <span class="social-icons__item"><span class="i-svg:site-gitee" /></span>
            </el-tooltip>
          </div>
        </div>

        <footer class="login-card__footer">
          <el-text size="small">
            Copyright © 2021 - 2025 youlai.tech
            <a href="http://beian.miit.gov.cn/" target="_blank">皖ICP备00064962号</a>
          </el-text>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import router from "@/router";
import { useSettingsStore, useUserStore, useDictStore } from "@/stores";
import { AuthStorage } from "@/utils/auth";
import { connectSse } from "@/composables/sse";
import logo from "@/assets/images/logo.png";
import { appConfig } from "@/settings";

import ThemeSwitch from "@/components/ThemeSwitch/index.vue";
import LangSelect from "@/components/LangSelect/index.vue";
import Hero from "./components/Hero.vue";
import Register from "./components/Register.vue";
import ResetPwd from "./components/ResetPwd.vue";
import AccountForm from "./components/AccountForm.vue";
import MfaForm from "./components/MfaForm.vue";
import PhoneForm from "./components/PhoneForm.vue";
import WechatQrCode from "./components/WechatQrCode.vue";
import BindForm from "./components/BindForm.vue";

/* ***************************** 参数定义 ********************************* */
const { t } = useI18n();
const route = useRoute();
const userStore = useUserStore();
const dictStore = useDictStore();
const settingsStore = useSettingsStore();
const tenantEnabled = appConfig.tenantEnabled;

/* ***************************** 操作函数 ********************************* */
/**
 * 登录成功后的跳转
 */
async function handleLoginSuccess() {
  // 需要在路由跳转前加载字典数据，否则会出现字典数据未加载完成导致页面渲染异常
  // 并行执行
  // await Promise.all([userStore.getUserInfo(), dictStore.loadDictionary(null)]);
  // 20260410: 字典列表改为异步加载
  dictStore.loadDictionary(null);
  // 20260517：登录时已经将用户信息缓存本地，没必要再次获取
  // await userStore.getUserInfo();
  // 登录成功后建立 SSE 连接
  connectSse();
  // 跳转到登录前的页面
  const { path, queryParams } = parseRedirect();
  router.push({ path, query: queryParams });
}

/**
 * 解析 redirect 字符串为 path 和 queryParams
 */
function parseRedirect(): { path: string; queryParams: Record<string, string> } {
  const query: Record<string, any> = route.query;
  const redirect = (query.redirect as string) ?? "/";
  const url = new URL(redirect, window.location.origin);
  const path = url.pathname;
  const queryParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });
  return { path, queryParams };
}

/* ***************************** 视图切换 ********************************* */
type LayoutMap = "login" | "register" | "resetPwd" | "mfa" | "phone" | "wechat" | "bind";
const component = ref<LayoutMap>("login");
const mfaTempToken = ref<string>(""); // MFA 临时 token（通用）
const bindCredential = ref<string>(""); // 第三方绑定用临时 token（通用）
const bindProvider = ref<string>("wechat"); // 第三方凭证类型，用于绑定表单图标展示

function showForm(type: LayoutMap, payload?: string) {
  if (type === "mfa" && payload) {
    mfaTempToken.value = payload;
  }
  component.value = type;
}

/**
 * 需要 MFA 二次认证（通用）
 *
 * 任意登录方式（账号密码 / 手机号 / 第三方凭证等）在需要二次认证时均可触发：
 * 当登录接口返回 userId 为空或 totpStatus 为 enabled 时，
 * 将返回的 accessToken 作为临时 token 传入，切换到 MFA 表单。
 *
 * @param tempToken 登录接口返回的临时 token（accessToken）
 */
function handleNeedMfa(tempToken: string) {
  mfaTempToken.value = tempToken;
  component.value = "mfa";
}

/**
 * 需要绑定账号（通用）
 *
 * 第三方凭证登录（微信 / 企微等）在系统中未找到关联账号时触发，
 * 携带绑定用临时 token 切换到通用绑定表单。
 *
 * @param tempToken 第三方凭证登录返回的临时 token
 * @param provider 第三方凭证类型（wechat / wecom 等），用于展示对应图标
 */
function handleNeedBind(tempToken: string, provider = "wechat") {
  bindCredential.value = tempToken;
  bindProvider.value = provider;
  component.value = "bind";
}

/* ***************************** 监听器等（需放在最后） ********************************* */
/**
 * 页面名称，需与路由中保持一致
 */
defineOptions({
  name: "Login",
  inheritAttrs: false,
});
/**
 * 页面加载时
 */
onMounted(() => {
  AuthStorage.loadDeviceId();
  // 进入登录页面时，默认清除
  userStore.resetAllState();
  // 加载系统公共配置（AES key、RSA 公钥、时间差等）
  settingsStore.loadServerSettings();
});
</script>

<style lang="scss" scoped>
.login-page {
  --login-hero-text: #1a1a2e;
  --login-card-bg: rgb(255 255 255 / 90%);
  --login-card-border: rgb(0 0 0 / 6%);
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: clamp(1rem, 3vw, 2rem);
  overflow: hidden;
  background: #f5f8ff;

  &::before {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    content: "";
    background: url("@/assets/images/login/bg.svg") center/cover no-repeat;
  }
}

.dark .login-page {
  --login-hero-text: #e4e8f0;
  --login-hero-sub: #8893a8;
  --login-card-bg: rgb(22 26 36 / 90%);
  --login-card-border: rgb(255 255 255 / 7%);

  background: #0b0f19;

  &::before {
    background-image: url("@/assets/images/login/bg-dark.svg");
  }
}

.login-page__toolbar {
  position: relative;
  z-index: 1;
  display: inline-flex;
  gap: 8px;
  align-self: flex-end;
  padding: 6px 10px;
  background: var(--login-card-bg);
  border: 1px solid var(--login-card-border);
  border-radius: 999px;
  backdrop-filter: blur(8px);

  .toolbar-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.2s;

    &:hover {
      background: var(--el-fill-color);
    }
  }

  @media (max-width: 640px) {
    position: fixed;
    top: 12px;
    right: 16px;
    z-index: 20;
  }
}

.login-page__body {
  position: relative;
  z-index: 1;
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: clamp(2rem, 4vw, 4rem);
  align-items: stretch;
  padding: clamp(1.5rem, 2vw, 2.5rem);
}

.login-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(1rem, 2vw, 2rem);
  color: var(--login-hero-text);
  animation: heroIn 0.8s ease-out;
}

.login-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-self: center;
  justify-self: end;
  width: min(420px, 100%);
  padding: clamp(1.5rem, 3vw, 2.25rem);
  margin-inline: auto;
  background: var(--login-card-bg);
  border: 1px solid var(--login-card-border);
  border-radius: 20px;
  box-shadow:
    0 2px 4px rgb(0 0 0 / 2%),
    0 12px 32px rgb(0 0 0 / 6%);
  backdrop-filter: blur(16px);
  animation: cardIn 0.7s ease;
}

.login-card__brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--login-card-border);
}

.login-card__logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  background: var(--el-color-primary-light-9);
  border-radius: 14px;
}

.login-card__logo {
  width: 26px;
  height: 26px;
}

.login-card__meta {
  flex: 1;
  min-width: 0;
}

.login-card__title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.05rem;
  font-weight: 650;
  white-space: nowrap;
}

.login-card__version-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 2px;
  font-size: 0.72rem;
}

.login-form__title {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 600;
}

.login-card__form {
  min-height: 364px;

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-input__wrapper) {
    background: rgb(0 0 0 / 2%);
    border-radius: 10px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 6%) inset;
    transition: all 0.2s;

    &:hover {
      box-shadow: 0 0 0 1px rgb(0 0 0 / 10%) inset;
    }

    &.is-focus {
      background: transparent;
      box-shadow: 0 0 0 1.5px var(--el-color-primary) inset;
    }
  }
}

.dark .login-card__form {
  :deep(.el-input__wrapper) {
    background: rgb(255 255 255 / 3%);
    box-shadow: 0 0 0 1px rgb(255 255 255 / 8%) inset;

    &:hover {
      box-shadow: 0 0 0 1px rgb(255 255 255 / 14%) inset;
    }

    &.is-focus {
      background: rgb(255 255 255 / 5%);
      box-shadow: 0 0 0 1.5px var(--el-color-primary) inset;
    }
  }
}

.login-form__social {
  .social-divider {
    display: flex;
    align-items: center;
    margin: 0 0 16px 0;

    &__line {
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, transparent, var(--el-border-color-light), transparent);
    }

    &__text {
      padding: 0 14px;
      font-size: 12px;
      color: var(--el-text-color-placeholder);
      white-space: nowrap;
    }
  }

  .social-icons {
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: center;

    &__item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      font-size: 18px;
      cursor: pointer;
      border: 1px solid transparent;
      border-radius: 10px;
      transition: all 0.2s;

      &:hover {
        background: var(--el-fill-color);
      }

      &.active {
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
        border-color: var(--el-color-primary-light-5);
      }
    }
  }
}

.login-card__footer {
  padding-top: 14px;
  font-size: 0.78rem;
  color: var(--el-text-color-placeholder);
  text-align: center;
  border-top: 1px solid var(--login-card-border);

  a {
    margin-left: 4px;
    color: var(--el-text-color-secondary);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

@media (max-width: 768px) {
  .login-page__body {
    display: block;
    padding: 0.5rem;
  }

  .login-hero {
    display: none;
  }
}

@keyframes heroIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
