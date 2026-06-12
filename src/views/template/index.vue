<template>
  <div class="app-container">
    <div class="search-bar">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="80px">
        <el-form-item prop="instituteId" label="机构">
          <el-tree-select
            ref="instituteSelectRef"
            v-model="queryParams.instituteId"
            :data="instituteTreeData"
            node-key="id"
            :props="{
              label: 'instituteName',
              children: 'children',
              disabled: '',
            }"
            :expand-on-click-node="false"
            :check-on-click-node="true"
            :filter-node-method="filterNodeMethod"
            check-strictly
            filterable
            clearable
            @change="handleInstituteSelect"
          >
            <template #prefix>
              <el-icon class="el-input__icon"><Search /></el-icon>
            </template>
          </el-tree-select>
        </el-form-item>
        <el-form-item prop="userName" label="账号">
          <el-input v-model="queryParams.userName" placeholder="请输入" clearable />
        </el-form-item>

        <el-form-item prop="status" label="状态">
          <el-select v-model="queryParams.status" placeholder="请选择" clearable>
            <el-option
              v-for="item in statusList"
              :key="item.dicCode"
              :label="item.dicValue"
              :value="item.dicCode"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="创建时间">
          <DatePicker
            v-model="dateRangeVal"
            type="daterange"
            width="260px"
            @on-change="handleDateRangeChange"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSubmitQuery">搜索</el-button>
          <el-button :icon="CircleClose" @click="handleResetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-card shadow="never" class="table-container">
      <template #header>
        <div class="flex-x-between">
          <div>
            <el-button type="success" :icon="Plus" @click="handleOpenInfoAddDialog">新增</el-button>
          </div>
          <div>
            <el-button :icon="Refresh" circle title="刷新" @click="handleQuery()" />
            <el-popover placement="bottom" trigger="click">
              <template #reference>
                <el-button :icon="Operation" circle title="筛选列" />
              </template>
              <el-scrollbar max-height="350px">
                <el-checkbox v-model="cols.index" value="true" label="序号" />
                <el-checkbox v-model="cols.userName" value="true" label="账号" />
                <el-checkbox v-model="cols.createTime" value="true" label="创建时间" />
              </el-scrollbar>
            </el-popover>
          </div>
        </div>
      </template>
      <el-table
        v-loading="tableLoading"
        :data="tableData"
        :max-height="tableMaxHeight"
        style="width: 100%"
        border
      >
        <el-table-column v-if="cols.index" type="index" label="序号" width="80" align="center" />
        <el-table-column
          v-if="cols.userName"
          prop="userName"
          label="账号"
          width="200"
          show-overflow-tooltip
        />
        <el-table-column v-if="cols.status" prop="status" label="分组" width="100" align="center">
          <template #default="{ row }">
            <DictTag :code="row.status" />
          </template>
        </el-table-column>
        <el-table-column v-if="cols.status" prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-switch
              v-model="scope.row.status"
              active-text="可用"
              inactive-text="禁用"
              :active-value="DictionaryEnum.STATE_NORMAL"
              :inactive-value="DictionaryEnum.STATE_DISABLE"
              :disabled="scope.row.isSystemTemplate"
              :style="`--el-switch-on-color: #409EFF; --el-switch-off-color: ${scope.row.isSystemTemplate ? 'rgb(242.5, 208.5, 157.5)' : 'rgb(237.5, 189.9, 118.5)'} `"
              inline-prompt
              @change="handleChangeState(scope.$index, scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column
          v-if="cols.createTime"
          prop="createTime"
          label="创建时间"
          width="110"
          align="center"
          :formatter="(row) => formatDate(row.createTime, 'YYYY-MM-DD HH:mm:ss')"
        />
        <el-table-column label="操作" width="110" align="center" fixed="right">
          <template #default="scope">
            <el-tooltip content="编辑">
              <el-button
                link
                size="small"
                type="primary"
                :icon="Edit"
                @click="handleOpenInfoEditDialog(scope.row)"
              />
            </el-tooltip>
            <el-popconfirm
              :icon="WarnTriangleFilled"
              icon-color="red"
              :title="`您确定要删除吗？【${scope.row.appName}】`"
              width="160"
              @confirm="handleDelete(scope.row)"
            >
              <template #reference>
                <el-button link size="small" type="danger">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
              <template #actions="{ confirm, cancel }">
                <el-button size="small" @click="cancel">取消</el-button>
                <el-button size="small" type="danger" @click="confirm">确定</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-pagination
          background
          layout="sizes, prev, pager, next"
          :total="tableDataTotal"
          :current-page="queryParams.pageNum"
          :page-size="queryParams.pageSize"
          @current-change="handlePagNumChange"
          @size-change="handlePagSizeChange"
          @change="handleQuery"
        />
      </template>
    </el-card>

    <InfoAddForm
      ref="infoAddFormRef"
      :institute-tree-data="instituteTreeData"
      @on-submit="handleQuery"
    />
  </div>
</template>

<script setup lang="ts">
import { DictionaryEnum } from "@/enums/system/dictionary.enum";
import { useDictStore } from "@/stores";
import DictTag from "@/components/DictTag/index.vue";
import { formatDate } from "@/utils/format";
import {
  Plus,
  Edit,
  Delete,
  Search,
  CircleClose,
  Refresh,
  Operation,
  WarnTriangleFilled,
} from "@element-plus/icons-vue";
import InstituteAPI, { InstituteTreeDto } from "@/api/institute";
import UserAPI, { UserListParam, UserInfoDto, UserStateParam } from "@/api/user";
import DatePicker from "@/components/DatePicker/index.vue";
import InfoAddForm from "./components/InfoAddForm.vue";

/* ***************************** 参数定义 ********************************* */
// 表格显示的列
const cols = ref({
  index: true,
  userName: true,
  status: true,
  createTime: true,
});
const dictStore = useDictStore();
const statusList = dictStore.listDictionary(DictionaryEnum.STATE);

/* ***************************** 日期选择 ********************************* */
// 选择的日期
const dateRangeVal = ref<[Date, Date]>();
/**
 * 日期选中后
 */
function handleDateRangeChange(_val: [Date, Date]) {
  // console.log("handleDateRangeChange", dateRangeVal.value, val);
  if (dateRangeVal.value && dateRangeVal.value.length > 0) {
    queryParams.createTimeStart = String(dateRangeVal.value[0].getTime());
    queryParams.createTimeEnd = String(dateRangeVal.value[1].getTime());
  } else {
    queryParams.createTimeStart = "";
    queryParams.createTimeEnd = "";
  }
}

/* ***************************** 机构选择 ********************************* */
/**
 * 自动加载：机构列表
 */
const instituteTreeData = ref<InstituteTreeDto[]>([]);
const loadInstitituteList = async () => {
  // 加载机构列表
  const data = await InstituteAPI.listInstituteByTree();
  instituteTreeData.value = data || [];
};
/**
 * 机构筛选
 */
function filterNodeMethod(value: string, data: any) {
  // console.log("filterNodeMethod", value, data);
  return !value ? true : (data as InstituteTreeDto).instituteName!.includes(value);
}
/**
 * 选中机构：联动
 */
function handleInstituteSelect(_instituteId: string) {
  // TODO 机构联动逻辑
}

/* ***************************** 搜索表单 ********************************* */
const queryFormRef = ref(ElForm);
const queryParams = reactive<UserListParam & { status?: string }>({
  pageNum: 1,
  pageSize: 10,
  createTimeStart: "",
  createTimeEnd: "",
});
/**
 * 重置查询
 */
function handleResetQuery() {
  queryFormRef.value.resetFields();
  queryParams.createTimeStart = "";
  queryParams.createTimeEnd = "";
  queryParams.pageNum = 1;
  handleQuery();
}

/**
 * 提交查询
 */
function handleSubmitQuery() {
  // console.log("提交查询", queryParams);
  queryParams.pageNum = 1;
  handleQuery();
}

/* ***************************** 数据表格 ********************************* */
const tableLoading = ref<boolean>(false);
const tableMaxHeight = ref("auto");
const tableDataTotal = ref<number>(0);
const tableData = ref<UserInfoDto[]>([]);

/**
 * 分页变更：页码变更
 * 会自动触发分页的 change 事件
 */
function handlePagNumChange(val: number) {
  queryParams.pageNum = val;
}
/**
 * 分页变更：每页条数变更
 * 会自动触发分页的 change 事件
 */
function handlePagSizeChange(val: number) {
  // 保持当前页面的数据
  //queryParams.pageNum = Math.ceil((queryParams.pageSize! * queryParams.pageNum! ) / val);
  queryParams.pageNum = 1;
  queryParams.pageSize = val;
}

/**
 * 数据查询
 */
function handleQuery() {
  // console.log("handleQuery", queryParams, cols);
  tableLoading.value = true;
  UserAPI.listUserInfoByPage(queryParams)
    .then((data) => {
      tableDataTotal.value = data.total || 0;
      tableData.value = data.result || [];
    })
    .finally(() => {
      tableLoading.value = false;
    });
}

/**
 * 变更：可用状态
 * change事件：传入的是变更后的值
 */
function handleChangeState(index: number, row: UserInfoDto) {
  const param = { id: row.id, status: row.status } as UserStateParam;
  UserAPI.updateUserState(param)
    .then((_data) => {
      ElMessage.success("状态变更成功");
    })
    .catch((_e) => {
      const oldStatus =
        DictionaryEnum.STATE_NORMAL == row.status
          ? DictionaryEnum.STATE_DISABLE
          : DictionaryEnum.STATE_NORMAL;
      tableData.value[index].status = oldStatus; // 还原变更前的值
    });
}

/* ***************************** 其他操作 ********************************* */
/**
 * 展示：新增弹窗
 */
const infoAddFormRef = ref(InfoAddForm);
function handleOpenInfoAddDialog() {
  console.log("handleOpenInfoAddDialog");
  infoAddFormRef.value.openDialog();
}
/**
 * 展示：编辑弹窗
 */
// const infoEditFormRef = ref(UserInfoEditForm);
function handleOpenInfoEditDialog(row: UserInfoDto) {
  console.log("handleOpenInfoEditDialog", row);
  //   infoEditFormRef.value.openDialog(row);
}

/**
 * 操作：删除
 */
function handleDelete(row: UserInfoDto) {
  // console.log("handleDelete", row);
  UserAPI.deleteUserInfo({ id: row.id }).then((_data) => {
    ElMessage.success("删除成功");
    handleQuery();
  });
}

/* ***************************** 监听器等（需放在最后） ********************************* */
/**
 * 页面名称，需与路由中保持一致
 */
defineOptions({
  name: "account-user_list",
  inheritAttrs: false,
});
/**
 * 页面加载时
 */
onMounted(() => {
  // 动态计算最大高度（例如：视口高度 - 其他元素高度）
  const tableHeight = Math.max(200, window.innerHeight - 320);
  tableMaxHeight.value = `${tableHeight}px`;

  loadInstitituteList();
  handleQuery();
});
</script>

<style lang="scss" scoped>
// card中的表格铺满
.table-container {
  display: flex;
  flex-direction: column;
  height: 100%; /* 确保父容器有高度 */
  border: 0;
}

.table-container > :deep(.el-card__header) {
  border-bottom: 0;
}

.table-container > :deep(.el-card__body) {
  padding: 0;
}

.table-container > :deep(.el-card__footer) {
  border-top: 0;
}
// 搜索框的表单宽度
.search-bar {
  .el-input {
    --el-input-width: 160px;
  }

  .el-select {
    --el-select-width: 160px;
  }
}
</style>
