<template>
  <div class="notice">
    <el-dropdown class="h-full items-center justify-center" trigger="click">
      <!-- 消息图标 -->
      <el-badge v-if="noticeCount > 0" :offset="[0, 15]" :value="noticeCount" :max="99">
        <el-icon><Bell /></el-icon>
      </el-badge>
      <div v-else>
        <el-icon><Bell /></el-icon>
      </div>
      <!-- 消息列表 -->
      <template #dropdown>
        <el-dropdown-menu>
          <el-tabs v-model="activeName" :stretch="true" class="dropdown-tabs w350px">
            <el-tab-pane :label="formatTabHeader('通知', notifyList.length)" name="notify">
              <NoticeList :list="notifyList" @on-show-detail="handleReadNotice" />
            </el-tab-pane>
            <el-tab-pane :label="formatTabHeader('消息', messageList.length)" name="message">
              <NoticeList :list="messageList" @on-show-detail="handleReadNotice" />
            </el-tab-pane>
            <el-tab-pane :label="formatTabHeader('任务', totoList.length)" name="todo">
              <NoticeList :list="totoList" @on-show-detail="handleReadNotice" />
            </el-tab-pane>
          </el-tabs>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <!-- 消息详情 -->
    <el-dialog
      v-model="detailVisible"
      :title="detailInfo?.messageTitle ?? '通知详情'"
      :close-on-click-modal="false"
      width="600px"
      custom-class="notice-detail"
    >
      <div v-if="detailInfo" class="notice-detail__wrapper">
        <div class="notice-detail__meta">
          <span>
            <el-icon><User /></el-icon>
            {{ detailInfo.senderName }}
          </span>
          <span class="ml-2">
            <el-icon><Timer /></el-icon>
            {{ formatDate(detailInfo.senderTime, "YYYY-MM-DD HH:mm:ss") }}
          </span>
        </div>

        <div class="notice-detail__content">
          <div v-html="detailInfo.messageContent"></div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from "@/utils/format";
import { DictionaryEnum } from "@/enums/system/dictionary.enum";
import { useUserStoreHook } from "@/stores";
import { useFetchEventSource } from "@/composables/sse/useEventSource";
import MessageAPI, { MsgInfoViewDto } from "@/api/message";
import NoticeList from "./NoticeList.vue";

/* ***************************** 实时消息 ********************************* */
// 采用SSE订阅消息
const apiHost = import.meta.env.VITE_APP_API_URL || "";
const baseURL = ""; // import.meta.env.VITE_APP_BASE_API || "";
const url = apiHost + baseURL + "/health/api/platform/v1/message/sse/subscribe";
const { connect, disconnect } = useFetchEventSource(url, {
  onMessage(message) {
    let data;
    try {
      data = JSON.parse(message.data);
    } catch (_e) {
      data = message.data;
    }
    if (message.event === "HEARTBEAT") {
      console.info("定时心跳包：", new Date(), data);
    } else if (message.event === "WARNING") {
      handleOnWarning(data);
    } else if (message.event === "MESSAGE") {
      handleOnMessage(data);
    } else if (message.event) {
      console.warn("未定义消息：", data);
    } else {
      console.info("无事件消息：", data);
    }
  },
});

/**
 * 异常警告（目前主要是被踢下线）
 */
function handleOnWarning(data: any) {
  ElNotification({
    title: "异常警告",
    message: data.messageContent,
    type: "error",
    position: "bottom-right",
    showClose: false,
    onClose: () => {
      // 跳转至登录页面
      useUserStoreHook()
        .resetAllState()
        .then(() => {
          router.push(`/login?redirect=${route.fullPath}`);
        });
    },
  });
}

/**
 * 业务信息（如通知公告、系统消息、代办任务）
 */
function handleOnMessage(data: MsgInfoViewDto) {
  // 消息存在则忽略
  const messageId = data.messageId;
  if (DictionaryEnum.MESSAGE_CATEGORY_NOTICE === data.messageType) {
    if (notifyList.value.some((item) => item.messageId == messageId)) {
      return;
    }
    notifyList.value.push(data);
  } else if (DictionaryEnum.MESSAGE_CATEGORY_SYSTEM === data.messageType) {
    if (messageList.value.some((item) => item.messageId == messageId)) {
      return;
    }
    messageList.value.push(data);
  } else if (DictionaryEnum.MESSAGE_CATEGORY_TODO === data.messageType) {
    if (totoList.value.some((item) => item.messageId == messageId)) {
      return;
    }
    totoList.value.push(data);
  }
  // 消息不存在时，弹出提醒
  noticeCount.value += 1;
  ElNotification({
    title: "您收到一条新的消息！",
    message: data.messageTitle || data.messageContent,
    type: "success",
    position: "bottom-right",
  });
}

/* ***************************** 消息列表 ********************************* */
const activeName = ref("notify");
const noticeCount = ref<number>(0); // 总消息数量
const notifyList = ref<MsgInfoViewDto[]>([]); // 通知列表
const messageList = ref<MsgInfoViewDto[]>([]); // 消息列表
const totoList = ref<MsgInfoViewDto[]>([]); // 待办任务列表
/**
 * 获取我的未读消息
 */
function featchMyNotice() {
  MessageAPI.listMyMessageByUnread({}).then((data) => {
    noticeCount.value = data.length || 0;
    parseNoticeList(data || []);
  });
}
/**
 * 解析消息列表
 */
function parseNoticeList(list: MsgInfoViewDto[]) {
  notifyList.value = list.filter(
    (item) => DictionaryEnum.MESSAGE_CATEGORY_NOTICE === item.messageType
  );
  messageList.value = list.filter(
    (item) => DictionaryEnum.MESSAGE_CATEGORY_SYSTEM === item.messageType
  );
  totoList.value = list.filter((item) => DictionaryEnum.MESSAGE_CATEGORY_TODO === item.messageType);
}
/**
 * 格式化标签名称
 */
function formatTabHeader(name: string, count: number) {
  return count == 0 ? `${name}` : `${name} (${count})`;
}

/* ***************************** 消息详情 ********************************* */
const detailVisible = ref(false);
const detailInfo = ref<MsgInfoViewDto | null>(null);
/**
 * 阅读通知公告
 */
function handleReadNotice(messageId: string) {
  MessageAPI.viewMessage({ id: messageId }).then((data) => {
    detailVisible.value = true;
    detailInfo.value = data;
    // // 标记为已读
    // const index = noticeList.value.findIndex((notice) => notice.messageId === messageId);
    // if (index >= 0) {
    //   noticeList.value.splice(index, 1);
    // }
  });
}

/* ***************************** 其他操作 ********************************* */
const route = useRoute();
const router = useRouter();
// /**
//  * 查看更多
//  */
// function handleViewMoreNotice() {
//   router.push({ path: "/message" });
// }

// /**
//  * 全部已读
//  */
// function handleMarkAllAsRead() {
//   MessageAPI.markMessageReadAll().then(() => {
//     noticeList.value = [];
//   });
// }

/* ***************************** 监听器等 ********************************* */
/**
 * 页面加载时，获取我的未读消息，并建立SSE链接
 */
onMounted(() => {
  featchMyNotice();
  // 延迟5秒后再加载，原因：
  // 1. 优先保证其他业务的请求连接
  // 2. 留出时间给服务端处理同账号的其他SSE连接
  setTimeout(() => {
    connect();
    console.info("页面加载时，建立SSE链接");
  }, 5000);
});
/**
 * 页面销毁时，断开SSE连接
 */
onBeforeUnmount(() => {
  console.info("页面销毁时，断开SSE连接");
  disconnect();
});
</script>

<style lang="scss" scoped>
.dropdown-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0 36px;
  }

  :deep(.el-tabs__nav-wrap)::after {
    height: 1px;
  }
}

.notice {
  :deep(.el-badge) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  :deep(.el-dialog) {
    line-height: initial;
    cursor: default;
  }

  .notice-detail {
    &__wrapper {
      padding: 0 20px;
    }

    &__meta {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      font-size: 13px;
      line-height: initial;
      color: var(--el-text-color-secondary);
    }

    &__content {
      max-height: 60vh;
      padding-top: 16px;
      margin-bottom: 24px;
      overflow-y: auto;
      line-height: initial;
      text-align: initial;
      border-top: 1px solid var(--el-border-color);

      &::-webkit-scrollbar {
        width: 6px;
      }
    }
  }
}
</style>
