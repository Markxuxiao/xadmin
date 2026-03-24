<template>
  <div class="role-list">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>角色管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        新建角色
      </el-button>
    </div>

    <!-- 搜索过滤器 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="角色名称">
          <el-input v-model="filterForm.name" placeholder="搜索角色名称" clearable />
        </el-form-item>
        <el-form-item label="角色代码">
          <el-input v-model="filterForm.code" placeholder="搜索角色代码" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 角色列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="filteredRoles"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="角色名称" width="180" />
        <el-table-column prop="code" label="角色代码" width="150">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限" min-width="300">
          <template #default="{ row }">
            <template v-if="row.permissions.includes('*')">
              <el-tag type="danger" size="small">全部权限</el-tag>
            </template>
            <template v-else>
              <el-tag
                v-for="perm in row.permissions.slice(0, 4)"
                :key="perm"
                type="info"
                size="small"
                class="mr-1"
              >
                {{ perm }}
              </el-tag>
              <span v-if="row.permissions.length > 4" class="text-muted">
                +{{ row.permissions.length - 4 }}
              </span>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'danger'" size="small">
              {{ row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="row.code === 'admin'"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 角色表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="roleForm"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色代码" prop="code">
          <el-input v-model="roleForm.code" placeholder="请输入角色代码，如 admin" :disabled="!!roleForm.id" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roleForm.description" type="textarea" placeholder="请输入角色描述" :rows="2" />
        </el-form-item>
        <el-form-item label="权限" prop="permissions">
          <div class="permission-group">
            <el-checkbox
              v-model="selectAllPermissions"
              :indeterminate="isIndeterminate"
              @change="handleSelectAllPermissions"
            >
              全选
            </el-checkbox>
            <el-divider style="margin: 8px 0" />
            <el-checkbox-group v-model="roleForm.permissions">
              <el-row :gutter="16">
                <el-col v-for="perm in availablePermissions" :key="perm.value" :span="12">
                  <el-checkbox :value="perm.value" :disabled="perm.value === '*' && !roleForm.permissions.includes('*')">
                    {{ perm.label }}
                  </el-checkbox>
                </el-col>
              </el-row>
            </el-checkbox-group>
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="roleForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getRoles, createRole, updateRole, deleteRole, type Role } from '@xadmin/frontend/runtime/api/role'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const availablePermissions = [
  { label: '全部权限', value: '*' },
  { label: '用户列表', value: 'user:list' },
  { label: '创建用户', value: 'user:create' },
  { label: '编辑用户', value: 'user:edit' },
  { label: '删除用户', value: 'user:delete' },
  { label: '角色列表', value: 'role:list' },
  { label: '创建角色', value: 'role:create' },
  { label: '编辑角色', value: 'role:edit' },
  { label: '删除角色', value: 'role:delete' },
  { label: '订单列表', value: 'order:list' },
  { label: '创建订单', value: 'order:create' },
  { label: '编辑订单', value: 'order:edit' },
  { label: '删除订单', value: 'order:delete' },
]

const filterForm = reactive({
  name: '',
  code: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const roleForm = reactive<Partial<Role>>({
  id: undefined,
  name: '',
  code: '',
  description: '',
  permissions: [],
  enabled: true,
})

const formRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色代码', trigger: 'blur' },
    { pattern: /^[a-z_]+$/, message: '角色代码只能包含小写字母和下划线', trigger: 'blur' },
  ],
  permissions: [{ required: true, message: '请选择至少一个权限', trigger: 'change' }],
}

const allRoles = ref<Role[]>([])

const filteredRoles = computed(() => {
  let result = allRoles.value
  if (filterForm.name) {
    result = result.filter(r => r.name.includes(filterForm.name))
  }
  if (filterForm.code) {
    result = result.filter(r => r.code.includes(filterForm.code))
  }
  pagination.total = result.length
  const start = (pagination.page - 1) * pagination.pageSize
  return result.slice(start, start + pagination.pageSize)
})

const dialogTitle = computed(() => isEdit.value ? '编辑角色' : '新建角色')

const selectAllPermissions = computed({
  get: () => roleForm.permissions?.length === availablePermissions.length,
  set: () => {},
})

const isIndeterminate = computed(() => {
  const len = roleForm.permissions?.length ?? 0
  return len > 0 && len < availablePermissions.length
})

function handleSelectAllPermissions(val: boolean) {
  roleForm.permissions = val ? availablePermissions.map(p => p.value) : []
}

async function fetchRoles() {
  loading.value = true
  try {
    const res = await getRoles()
    if (res.success) {
      allRoles.value = res.data
      pagination.total = res.data.length
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '获取角色列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
}

function handleReset() {
  filterForm.name = ''
  filterForm.code = ''
  pagination.page = 1
}

function handlePageChange() {}

function handlePageSizeChange() {
  pagination.page = 1
}

function handleCreate() {
  isEdit.value = false
  Object.assign(roleForm, {
    id: undefined,
    name: '',
    code: '',
    description: '',
    permissions: [],
    enabled: true,
  })
  dialogVisible.value = true
}

function handleEdit(row: Role) {
  isEdit.value = true
  Object.assign(roleForm, {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    permissions: [...row.permissions],
    enabled: row.enabled,
  })
  dialogVisible.value = true
}

async function handleDelete(row: Role) {
  try {
    await ElMessageBox.confirm(
      `确定删除角色 "${row.name}" (${row.code}) 吗？`,
      '删除确认',
      { type: 'warning' }
    )
    const res = await deleteRole(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      fetchRoles()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '删除失败')
    }
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = {
      name: roleForm.name,
      code: roleForm.code,
      description: roleForm.description,
      permissions: roleForm.permissions,
      enabled: roleForm.enabled,
    }

    const res = isEdit.value
      ? await updateRole(roleForm.id!, payload)
      : await createRole(payload)

    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchRoles()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function handleDialogClose() {
  formRef.value?.resetFields()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN')
}

onMounted(() => {
  fetchRoles()
})
</script>

<style scoped>
.role-list {
  max-width: 1400px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.filter-card {
  margin-bottom: 16px;
}

.table-card {
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.mr-1 {
  margin-right: 4px;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

.permission-group {
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  padding: 12px;
}
</style>
