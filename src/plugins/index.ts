import type { App } from "vue";

import { setupStore } from "@/stores";
import { setupI18n } from "./modules/i18n";

import { setupDirective } from "@/directives";
import { setupIcons } from "./modules/icons";

import { setupRouter } from "@/router";

import { setupWebSocket } from "./modules/websocket";
import { setupVxeTable } from "./modules/vxeTable";
import { InstallCodeMirror } from "codemirror-editor-vue3";

export default {
  install(app: App<Element>) {
    // 状态管理(store)
    setupStore(app);
    // 国际化
    setupI18n(app);

    // 指令：自定义指令(directive)
    setupDirective(app);

    // 组件：图标集
    setupIcons(app);

    // 路由(router)
    setupRouter(app);

    // WebSocket服务
    setupWebSocket();
    // vxe-table
    setupVxeTable(app);
    // CodeMirror
    app.use(InstallCodeMirror);
  },
};
