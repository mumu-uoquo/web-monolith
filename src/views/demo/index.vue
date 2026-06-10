<template>
  <div>
    <el-button @click="iframeInThisTag">当前标签加载外站（https://api.uoquo.com）</el-button>
    <el-button @click="iframeInNewsTag">新开标签加载外站（https://www.uoquo.com）</el-button>
    <el-button @click="iframeErrorPath">外站资源需添加协议头！（www.uoquo.com）</el-button>
    <el-divider />
    <el-button @click="open4OuterWeb">弹窗加载外站（https://www.uoquo.com）</el-button>
    <el-button @click="open4InnerTag">弹窗加载外站（/visitor/ecg/index）</el-button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

defineOptions({
  name: "demo-index",
});

function iframeInThisTag() {
  router.push({
    path: "/iframe/https://api.uoquo.com?a=1&b=3", // 这里的参数无效
    query: {
      t: "111",
    },
  });
}

function iframeInNewsTag() {
  router.push({
    path: "/iframe/https://www.uoquo.com",
    query: {
      t: "222",
      title: "内嵌的外站", // 标签的名称
    },
  });
}

function iframeErrorPath() {
  router.push({
    path: "/iframe//www.uoquo.com",
    query: {
      t: "333",
      title: "无效的路径",
    },
  });
}

// 按钮触发弹窗不能直接用router.push跳转到redirect.vue处理，只能直接用window.open
function open4OuterWeb() {
  router.push({
    path: "/redirect/https://www.uoquo.com",
    query: {
      t: "222",
      title: "外链弹窗",
    },
  });
}

function open4InnerTag() {
  router.push({
    path: "/iframe/https://www.uoquo.com",
    query: {
      t: "222",
      title: "内链弹窗",
    },
  });
}
</script>
