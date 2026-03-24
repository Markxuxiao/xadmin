<template>
  <div class="department-page">
    <div class="page-header">
      <h2>部门管理</h2>
      <el-button type="primary" @click="handleAdd(null)">新增部门</el-button>
    </div>

    <div class="department-layout">
      <!-- 部门树 -->
      <div class="department-tree">
        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="treeProps"
          node-key="id"
          default-expand-all
          :expand-on-click-node="false"
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data }">
            <span class="tree-node">
              <span class="node-label">{{ data.name }}</span>
              <span class="node-code">({{ data.code }})</span>
              <span class="node-actions">
                <el-button type="primary" link size="small" @click.stop="handleAdd(data)">新增</el-button>
                <el-button type="primary" link size="small" @click.stop="handleEdit(data)">编辑</el-button>
                <el-button type="danger" link size="small" @click.stop="handleDelete(data)" :disabled="data.children?.length > 0">删除</el-button>
              </span>
            </span>
          </template>
        </el-tree>
      </div>

      <!-- 部门详情 -->
      <div class="department-detail" v-if="selectedDept">
        <h3>部门详情</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="部门名称">{{ selectedDept.name }}</el-descriptions-item>
          <el-descriptions-item label="部门编码">{{ selectedDept.code }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ selectedDept.leader || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ selectedDept.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ selectedDept.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedDept.enabled ? 'success' : 'info'" size="small">
              {{ selectedDept.enabled ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="排序">{{ selectedDept.sort }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(selectedDept.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑部门' : '新增部门'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="上级部门">
          <el-tree-select
            v-model="form.parentId"
            :data="treeData"
            :props="treeProps"
            check-strictly
            clearable
            placeholder="请选择上级部门（不选则为顶级）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="部门编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入部门编码" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="负责人" prop="leader">
          <el-input v-model="form.leader" placeholder="请输入负责人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDepartmentTree, createDepartment, updateDepartment, deleteDepartment, type Department } from '../runtime/api/department'

const loading = ref(false)
const treeData = ref<Department[]>([])
const selectedDept = ref<Department | null>(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const treeProps = {
  children: 'children',
  label: 'name',
}

const defaultForm = {
  parentId: null as string | null,
  name: '',
  code: '',
  leader: '',
  phone: '',
  email: '',
  sort: 0,
  enabled: true,
}

const form = reactive({ ...defaultForm })

const rules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入部门编码', trigger: 'blur' }],
}

async function fetchTree() {
  loading.value = true
  try {
    const res = await getDepartmentTree()
    if (res.success) {
      treeData.value = res.data
    }
  } catch (e) {
    ElMessage.error('加载部门树失败')
  } finally {
    loading.value = false
  }
}

function handleNodeClick(data: Department) {
  selectedDept.value = data
}

function handleAdd(parent: Department | null) {
  isEdit.value = false
  Object.assign(form, { ...defaultForm, parentId: parent?.id || null })
  dialogVisible.value = true
}

function handleEdit(data: Department) {
  isEdit.value = true
  Object.assign(form, {
    parentId: data.parentId,
    name: data.name,
    code: data.code,
    leader: data.leader || '',
    phone: data.phone || '',
    email: data.email || '',
    sort: data.sort,
    enabled: data.enabled,
  })
  dialogVisible.value = true
}

async function handleDelete(data: Department) {
  try {
    await ElMessageBox.confirm(`确定删除部门"${data.name}"？`, '提示', { type: 'warning' })
    const res = await deleteDepartment(data.id)
    if (res.success) {
      ElMessage.success('删除成功')
      fetchTree()
      if (selectedDept.value?.id === data.id) {
        selectedDept.value = null
      }
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const submitData = {
      parentId: form.parentId || null,
      name: form.name,
      code: form.code,
      leader: form.leader || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      sort: form.sort,
      enabled: form.enabled,
    }

    const res = isEdit.value
      ? await updateDepartment((selectedDept.value as any)?.id || form.code, submitData)
      : await createDepartment(submitData)

    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchTree()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  fetchTree()
})
</script>

<style scoped>
.department-page {
  max-width: 1400px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.department-layout {
  display: flex;
  gap: 24px;
}

.department-tree {
  width: 400px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.node-label {
  font-weight: 500;
}

.node-code {
  color: #909399;
  font-size: 12px;
}

.node-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.department-detail {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

.department-detail h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
}
</style>
