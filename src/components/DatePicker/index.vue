<template>
  <!-- 日期范围选择 -->
  <div v-if="props.type === 'daterange'" class="date-picker-container">
    <el-date-picker
      v-model="modelVal"
      type="daterange"
      start-placeholder="起始日期"
      range-separator="-"
      end-placeholder="结束日期"
      :shortcuts="dateShortcuts"
      :default-time="getRangeDate(0)"
      :size="size"
      :style="{ width: props.width }"
      unlink-panels
      clearable
      @change="handleDateRangeChange"
    >
      <template #default="cell">
        <div class="cell el-date-table-cell" :class="{ current: cell.isCurrent }">
          <span class="text el-date-table-cell__text">{{ cell.text }}</span>
          <span :class="getDayCellClass(cell.dayjs)" />
        </div>
      </template>
    </el-date-picker>
  </div>

  <!-- 日期选择 -->
  <div v-if="props.type === 'date'" class="date-container">
    <el-date-picker
      v-model="modelVal"
      type="date"
      placeholder="请选择日期"
      :size="size"
      :style="{ width: props.width }"
      @change="handleDateChange"
    >
      <template #default="cell">
        <div class="cell el-date-table-cell" :class="{ current: cell.isCurrent }">
          <span class="text el-date-table-cell__text">{{ cell.text }}</span>
          <span :class="getDayCellClass(cell.dayjs)" />
        </div>
      </template>
    </el-date-picker>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import { DictionaryEnum } from "@/enums";
import { formatDate, getRangeDate } from "@/utils/format";
import SystemAPI, { SysHolidaySearchParam, SysHolidayDto } from "@/api/system";

/* ***************************** 参数定义 ********************************* */
// 父级组件绑定的v-modle
const modelVal = defineModel<any>();
// 暴露给父级的自定义事件
const emits = defineEmits<{
  (e: "on-change", val: any): void;
}>();
// 暴露给父级的自定义属性
const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  size: {
    type: String as PropType<"" | "default" | "small" | "large">,
    required: false,
    validator: (value: string) => ["", "default", "small", "large"].includes(value),
    default: "default",
  },
  width: {
    type: String,
    required: false,
    default: "auto",
  },
});

/* ***************************** 日期选择 ********************************* */
// 快捷选择
const dateShortcuts = [
  {
    text: "今天",
    value: () => getRangeDate(0),
  },
  {
    text: "最近一周",
    value: () => getRangeDate(-7),
  },
  {
    text: "最近一月",
    value: () => getRangeDate(-30),
  },
  {
    text: "最近三月",
    value: () => getRangeDate(-90),
  },
];
// 节假日
const holidays = ref<string[]>([]);
// 工作日
const workdays = ref<string[]>([]);
/**
 * 加载数据
 */
function loadHolidays() {
  const params = {} as SysHolidaySearchParam;
  SystemAPI.listHoliday(params).then((data) => {
    holidays.value = data
      .filter((item: SysHolidayDto) => {
        return item.dateType === DictionaryEnum.DAY_TYPE_HOLIDAY;
      })
      .map((item: SysHolidayDto) => {
        return formatDate(item.dateValue, "YYYY-MM-DD");
      });
    workdays.value = data
      .filter((item: SysHolidayDto) => {
        return item.dateType === DictionaryEnum.DAY_TYPE_WORKDAY;
      })
      .map((item: SysHolidayDto) => {
        return formatDate(item.dateValue, "YYYY-MM-DD");
      });
  });
}
/**
 * 判断是否是节假日
 */
function getDayCellClass(dayjs: any): string {
  if (holidays.value.includes(dayjs.format("YYYY-MM-DD"))) {
    return "holiday";
  } else if (workdays.value.includes(dayjs.format("YYYY-MM-DD"))) {
    return "workday";
  } else {
    return "normal";
  }
}
/**
 * 日期选中后
 */
function handleDateChange(val: Date) {
  // console.log("componets handleDateChange", val);
  emits("on-change", val);
}
/**
 * 日期范围选中后
 */
function handleDateRangeChange(val: [Date, Date]) {
  // console.log("componets handleDateRangeChange", val);
  emits("on-change", val);
}

/* ***************************** 监听器等（需放在最后） ********************************* */
/**
 * 页面加载时
 */
onMounted(() => {
  loadHolidays();
});
/**
 * 暴露给父级组件的方法
 */
defineExpose({
  // handleResetQuery,
});
</script>

<style lang="scss" scoped>
// 日期框样式
.date-picker-container {
  display: flex;
  justify-content: space-between;
  min-width: 260px;
}
.date-container {
  display: flex;
  justify-content: space-between;
  min-width: 140px;
}

.cell {
  box-sizing: border-box;
  height: 30px;
  padding: 3px 0;
}
.cell .text {
  position: absolute;
  left: 50%;
  display: block;
  width: 24px;
  height: 24px;
  margin: 0 auto;
  line-height: 24px;
  border-radius: 50%;
  transform: translateX(-50%);
}
.today .cell .text,
.cell.current .text {
  color: #fff;
  background: #626aef;
}
// 普通标识
.cell .normal {
  display: hidden;
}
// 节假日标识
.cell .holiday {
  position: absolute;
  bottom: 0px;
  left: 50%;
  width: 6px;
  height: 6px;
  background: var(--el-color-success);
  border-radius: 50%;
  transform: translateX(-50%);
}
// 工作日标识
.cell .workday {
  position: absolute;
  bottom: 0px;
  left: 50%;
  width: 6px;
  height: 6px;
  background: var(--el-color-danger);
  border-radius: 50%;
  transform: translateX(-50%);
}
</style>
