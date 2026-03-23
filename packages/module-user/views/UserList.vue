<template>
  <div class="user-list">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        新建用户
      </el-button>
    </div>

    <!-- 搜索过滤器 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="用户名">
          <el-input v-model="filterForm.username" placeholder="搜索用户名" clearable />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="filterForm.nickname" placeholder="搜索昵称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="filteredUsers"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column label="角色" width="200">
          <template #default="{ row }">
            <el-tag v-for="role in row.roles" :key="role" size="small" class="mr-2">
              {{ role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限" min-width="200">
          <template #default="{ row }">
            <el-tag
              v-for="perm in row.permissions.slice(0, 3)"
              :key="perm"
              type="info"
              size="small"
              class="mr-1"
            >
              {{ perm }}
            </el-tag>
            <span v-if="row.permissions.length > 3" class="text-muted">
              +{{ row.permissions.length - 3 }}
            </span>
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
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
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

    <!-- 用户表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="userForm"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" :disabled="!!userForm.id" />
        </el-form-item>
        <el-form-item label="密码" :prop="userForm.id ? '' : 'password'">
          <el-input
            v-model="userForm.password"
            type="password"
            :placeholder="userForm.id ? '留空则不修改' : '请输入密码'"
            show-password
          />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="userForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="角色" prop="roles">
          <el-select v-model="userForm.roles" multiple placeholder="选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="用户" value="user" />
            <el-option label="访客" value="guest" />
          </el-select>
        </el-form-item>
        <el-form-item label="权限" prop="permissions">
          <el-select v-model="userForm.permissions" multiple placeholder="选择权限" style="width: 100%">
            <el-option label="用户列表" value="user:list" />
            <el-option label="创建用户" value="user:create" />
            <el-option label="编辑用户" value="user:edit" />
            <el-option label="删除用户" value="user:delete" />
            <el-option label="订单列表" value="order:list" />
            <el-option label="创建订单" value="order:create" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="userForm.enabled" />
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
import client from '@xadmin/frontend/runtime/api/client'

interface User {
  id: string
  username: string
  nickname: string
  roles: string[]
  permissions: string[]
  enabled: boolean
  createdAt: string
}

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const filterForm = reactive({
  username: '',
  nickname: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const userForm = reactive<Partial<User & { password: string }>>({
  id: undefined,
  username: '',
  password: '',
  nickname: '',
  roles: [],
  permissions: [],
  enabled: true,
})

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  roles: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const allUsers = ref<User[]>([])

const filteredUsers = computed(() => {
  let result = allUsers.value
  if (filterForm.username) {
    result = result.filter(u => u.username.includes(filterForm.username))
  }
  if (filterForm.nickname) {
    result = result.filter(u => u.nickname.includes(filterForm.nickname))
  }
  pagination.total = result.length
  const start = (pagination.page - 1) * pagination.pageSize
  return result.slice(start, start + pagination.pageSize)
})

const dialogTitle = computed(() => isEdit.value ? '编辑用户' : '新建用户')

async function fetchUsers() {
  loading.value = true
  try {
    const res = await client.get<{ success: boolean; data: User[] }>('/user')
    if (res.data.success) {
      allUsers.value = res.data.data
      pagination.total = res.data.data.length
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
}

function handleReset() {
  filterForm.username = ''
  filterForm.nickname = ''
  pagination.page = 1
}

function handlePageChange() {
  // filteredUsers is computed, so this just triggers re-render
}

function handlePageSizeChange() {
  pagination.page = 1
}

function handleCreate() {
  isEdit.value = false
  Object.assign(userForm, {
    id: undefined,
    username: '',
    password: '',
    nickname: '',
    roles: [],
    permissions: [],
    enabled: true,
  })
  dialogVisible.value = true
}

function handleEdit(row: User) {
  isEdit.value = true
  Object.assign(userForm, {
    id: row.id,
    username: row.username,
    password: '',
    nickname: row.nickname,
    roles: [...row.roles],
    permissions: [...row.permissions],
    enabled: row.enabled,
  })
  dialogVisible.value = true
}

async function handleDelete(row: User) {
  try {
    await ElMessageBox.confirm(
      `确定删除用户 "${row.nickname}" (${row.username}) 吗？`,
      '删除确认',
      { type: 'warning' }
    )
    const res = await client.delete<{ success: boolean }>(`/user/${row.id}`)
    if (res.data.success) {
      ElMessage.success('删除成功')
      fetchUsers()
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
    const payload: any = {
      username: userForm.username,
      nickname: userForm.nickname,
      roles: userForm.roles,
      permissions: userForm.permissions,
      enabled: userForm.enabled,
    }
    if (userForm.password) {
      payload.password = userForm.password
    }

    const res = isEdit.value
      ? await client.put(`/user/${userForm.id}`, payload)
      : await client.post('/user', payload)

    if (res.data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchUsers()
    } else {
      ElMessage.error(res.data.message || '操作失败')
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
  fetchUsers()
})
</script>

<style scoped>
.user-list {
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

.mr-2 {
  margin-right: 8px;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}
</style>
