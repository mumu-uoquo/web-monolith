<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    :close-on-click-modal="false"
    draggable
    @close="handleCloseDialog"
  >
    <el-form
      ref="infoFormRef"
      :model="infoFormData"
      :rules="infoFormRules"
      status-icon
      label-width="100px"
      :inline="true"
      class="form-inline mt-5"
    >
      <el-form-item prop="instituteId" label="所属机构">
        <el-tree-select
          ref="instituteSelectRef"
          v-model="infoFormData.instituteId"
          placeholder="请选择机构，保存后不可修改"
          :data="props.instituteTreeData"
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
          @change="handleInstituteSelect"
        >
          <template #prefix>
            <el-icon class="el-input__icon"><Search /></el-icon>
          </template>
        </el-tree-select>
      </el-form-item>

      <el-form-item label="账号名称" prop="userName">
        <el-input
          v-model="infoFormData.userName"
          placeholder="系统唯一，可用于登录"
          maxlength="20"
          show-word-limit
          clearable
        />
      </el-form-item>
      <el-form-item label="真实姓名" prop="realName">
        <el-input
          v-model="infoFormData.realName"
          placeholder="可以为空，用于消息发送"
          maxlength="20"
          show-word-limit
          clearable
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取 消</el-button>
      <el-button type="primary" @click="handleInfoSubmit">保 存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormRules } from "element-plus";
import { DictionaryEnum } from "@/enums/system/dictionary.enum";
// import { useDictStore } from "@/stores";
import { InstituteTreeDto } from "@/api/institute";
import UserAPI, { UserAddParam } from "@/api/user";
import { encryptPassword } from "@/utils/ctypto";

/* ***************************** 参数定义 ********************************* */
// 暴露给父级的自定义事件
const emits = defineEmits(["on-submit"]);
// 暴露给父级的自定义属性
const props = defineProps<{
  instituteTreeData: InstituteTreeDto[];
}>();

const dialogVisible = ref<boolean>(false);
const dialogTitle = ref<string>("新增");

// const dictStore = useDictStore();
// const statusList = dictStore.listDictionary(DictionaryEnum.STATE);

/* ***************************** 机构选择 ********************************* */
/**
 * 机构筛选
 */
function filterNodeMethod(value: string, data: InstituteTreeDto) {
  // console.log("filterNodeMethod", value, data);
  return !value ? true : data.instituteName!.includes(value);
}
/**
 * 机构选中：部门、角色、分组的联动
 */
function handleInstituteSelect(instituteId: string) {
  console.log("handleInstituteSelect", instituteId);
}

/* ***************************** 表单操作 ********************************* */
// 扩展部分属性
interface InfoFormParam extends UserAddParam {
  pwdColor1?: string; // 密码强度颜色
  pwdColor2?: string; // 密码强度颜色
  pwdColor3?: string; // 密码强度颜色
  innerRoleIdList: string[];
  normalRoleIdList: string[];
  privateRoleIdList: string[];
}
// 初始表单数据
const initialFormData = ref<InfoFormParam>({
  userName: "",
  userCode: "",
  realName: "",
  thirdId: "",
  instituteId: "",
  deptId: "",
  phone: "",
  email: "",
  password: "",
  pwdLevel: DictionaryEnum.PASSWORD_WEAK,
  pwdColor1: "#BBBBBB",
  pwdColor2: "#BBBBBB",
  pwdColor3: "#BBBBBB",
  userRoleIdList: [],
  userGroupIdList: [],
  innerRoleIdList: [],
  normalRoleIdList: [],
  privateRoleIdList: [],
});
// 自定义校验规则（角色必选）
const validateRoleList = (rule: any, value: any, callback: any) => {
  const roles = [
    ...infoFormData.value.innerRoleIdList,
    ...infoFormData.value.normalRoleIdList,
    ...infoFormData.value.privateRoleIdList,
  ];
  if (roles.length === 0) {
    callback(new Error("请至少选择一个角色"));
  } else {
    callback();
  }
};

const infoFormRef = ref(ElForm);
const infoFormData = ref<InfoFormParam>({ ...initialFormData.value }); // 表单数据
const infoFormRules = reactive<FormRules<InfoFormParam>>({
  instituteId: [{ required: true, message: "请选择所属机构", trigger: "change" }],
  userName: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    {
      min: 2,
      max: 20,
      pattern: /^[a-zA-Z]+[a-zA-Z0-9]+$/,
      message: "只能输入 2 到 20 位的字母和数字",
      trigger: "blur",
    },
  ],
  userRoleIdList: [{ required: true, validator: validateRoleList, trigger: "blur" }],
  userGroupIdList: [{ required: true, message: "请至少选择一个用户组", trigger: "blur" }],
});

/**
 * 保存提交（防抖）
 */
const handleInfoSubmit = useDebounceFn(async () => {
  const params = {
    userName: infoFormData.value.userName,
    userCode: infoFormData.value.userCode,
    realName: infoFormData.value.realName,
    thirdId: infoFormData.value.thirdId,
    instituteId: infoFormData.value.instituteId,
  } as UserAddParam;
  params.password = await encryptPassword(params.password || "");
  // console.log("handleInfoSubmit", params);
  infoFormRef.value.validate((isValid: boolean) => {
    if (!isValid) {
      return false;
    }
    UserAPI.addUserInfo(params).then((_data) => {
      ElMessage.success("保存成功");
      dialogVisible.value = false; // 关闭窗体
      emits("on-submit"); // 刷新列表
    });
  });
}, 500);

/* ***************************** 窗体操作 ********************************* */
/**
 * 显示弹窗：新增
 */
const openDialog = async () => {
  // 最后显示弹窗
  dialogVisible.value = true;
  dialogTitle.value = "新增";
};

/**
 * 显示弹窗：编辑
 */
const openEditDialog = async (data: UserAddParam) => {
  dialogVisible.value = true;
  dialogTitle.value = "编辑";
  Object.assign(infoFormData.value, data);
};

/**
 * 关闭弹窗
 */
function handleCloseDialog() {
  dialogVisible.value = false;
  infoFormRef.value.clearValidate();
  Object.assign(infoFormData.value, initialFormData.value);
}

/* ***************************** 监听器等 ********************************* */
// 监听属性变化
watchEffect(() => {
  // areaTreeData.value = props.areaData;
});
// 暴露给父级的自定义方法（需放在最后）
defineExpose({
  openDialog,
  openEditDialog,
});
</script>

<style lang="scss" scoped>
// 横排表单
.form-inline {
  .el-form-item {
    width: 45%;
  }
  .full-row {
    width: 90%;
  }
  // .el-input {
  //   --el-input-width: 220px;
  // }
  // .el-select {
  //   --el-select-width: 220px;
  // }
  .el-checkbox {
    min-width: 100px;
  }
}
</style>
