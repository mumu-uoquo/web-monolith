<template>
  <h1>
    欢迎使用 {{ defaultSettings.title }}({{ defaultSettings.version }}) {{ $t("route.welcome") }}
  </h1>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { defaultSettings } from "@/settings";
defineOptions({
  name: "Welcome",
});
const { t } = useI18n();
console.log(t("route.welcome"));
</script>
