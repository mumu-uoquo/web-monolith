# 项目简介

基于 [vue3-element-admin 4.6.0](https://gitee.com/youlaiorg/vue3-element-admin) 深度定制的业务管理系统前端，在原项目基础上进行了通信安全、架构和功能层面的扩展与重构。

## 与 vue3-element-admin 的主要区别

### 通信安全

- **请求签名**：所有 HTTP 请求携带 MD5 签名头（`signature-app`），签名由 `appid + token + nonce + device-id + timestamp + 语言 + query 参数 + 请求体` 按规则拼接后 MD5 计算，防篡改
- **加解密工具**（`src/utils/crypto.ts`）：封装 `encrypt` / `decrypt` 命名空间，支持 MD5、SHA256、AES（CBC/PKCS7）、RSA 公钥加解密；所有密文统一使用十六进制（hex）格式传输
- **密码加密策略**：登录及修改密码时，优先使用服务端下发的 RSA 公钥加密（MD5 哈希后再 RSA），公钥不可用时自动降级为时间因子 AES（`taes`）
- **时间因子 AES**（`taes`）：以 5 秒为粒度生成密钥，解密时支持 ±1 个窗口的容错重试，适配网络延迟场景
- **公共配置加载**（`settingsStore.loadServerSettings()`）：应用启动时从服务端拉取`security.rsa.publicKey`、`server.time` 等配置，configValue 使用 taes 解密，同时计算本地与服务器的时间差（`serverTimeDiff`）

### 实时通信（SSE）

项目完善了 SSE 基础设施：

- **`useSse`**（`src/composables/sse/useSse.ts`）：基于 Fetch API 的原生 SSE 实现，支持指数退避重连、连接超时检测、手动断连区分（不触发重连）、服务端主动关闭后自动重连
- **`useNoticeSync`**（`src/composables/sse/useNoticeSync.ts`）：消息通知同步单例，内部处理心跳包和踢下线逻辑，对外暴露 `onNotify` / `onMessage` / `onTodo` 三类订阅接口
- **连接生命周期管理**：`connectSse()` 在登录成功后调用，`disconnectSse()` 在退出时调用；事件订阅的 `initialize()` / `cleanup()` 由各使用组件（如 `NoticeDropdown`）在 `onMounted` / `onBeforeUnmount` 里自行管理，与连接生命周期解耦

### 语言与配置

- 请求签名中的 `user-language` 字段从 `localStorage` 动态读取（`STORAGE_KEYS.LANGUAGE`），跟随界面语言切换，不再硬编码为 `zh-CN`
- 公共系统配置（水印开关等）由 `settingsStore` 统一管理，登录页和 visitor 页面均会触发加载

### 构建流程

- 执行 `pnpm build` 除 Vite 构建外，额外运行 `build-git.js`（写入 `dist/gitinfo.json`）和 `build-zip.js`（生成发布压缩包）
- `build-git.js` 优先读取 `origin/<branch>` 的 commit 信息，远程不存在时自动回退到本地 HEAD，git 命令执行失败时优雅降级

---

## 快速开始

**环境要求**

| 环境 | 版本 |
|------|------|
| Node.js | `^20.19.0` 或 `>=22.12.0` |
| pnpm | `>=8.0.0` |

```bash
# 安装 pnpm（如已安装可跳过）
npm install -g pnpm

# 安装依赖
pnpm install

# esbuild 原生模块需要批准构建脚本（首次安装后执行一次）
pnpm approve-builds

# 启动开发服务
pnpm dev
```

开发服务默认代理后端接口，代理配置见 `.env.development` 中的 `VITE_APP_BASE_API` 和 `VITE_APP_API_URL`。

---

## 项目部署

```bash
# 构建生产包（含类型检查、git 信息写入、压缩打包）
pnpm build

# 仅 Vite 构建，跳过类型检查和后处理脚本
pnpm build-only
```

构建产物输出到 `dist/` 目录，将其上传至服务器后配置 Nginx：

```nginx
server {
    listen      80;
    server_name your-domain.com;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;  # 支持 history 路由
    }

    # 反向代理后端接口
    location /prod-api/ {
        proxy_pass http://your-backend-api/;
    }
}
```

---

## 相关链接

- 上游项目：[vue3-element-admin](https://gitee.com/youlaiorg/vue3-element-admin)（MIT 协议）
- 官方文档：[https://www.youlai.tech/vue3-element-admin](https://www.youlai.tech/vue3-element-admin/)

## License

[MIT](LICENSE)
