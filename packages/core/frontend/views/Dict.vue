<template>
  <div class="dict-page">
    <div class="page-header">
      <h2>字典管理</h2>
      <el-button type="primary" @click="handleAdd">新增字典</el-button>
    </div>

    <x-table
      :loading="loading"
      :data="tableData"
      :empty="!loading && tableData.length === 0"
      empty-text="暂无字典数据"
    >
      <template #toolbar>
        <el-select v-model="filterType" placeholder="字典类型" clearable style="width: 150px" @change="fetchData">
          <el-option label="数据字典" value="dict" />
          <el-option label="系统配置" value="system" />
        </el-select>
      </template>

      <el-table-column prop="name" label="字典名称" min-width="120" />
      <el-table-column prop="code" label="字典编码" min-width="120" />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.type === 'system' ? 'success' : 'primary'" size="small">
            {{ row.type === 'system' ? '系统配置' : '数据字典' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="value" label="字典值" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.type === 'system' ? row.value : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="items" label="字典项" min-width="150">
        <template #default="{ row }">
          <template v-if="row.type === 'dict' && row.items?.length">
            <el-tag v-for="item in row.items.slice(0, 3)" :key="item.value" size="small" style="margin-right: 4px">
              {{ item.label }}
            </el-tag>
            <span v-if="row.items.length > 3" style="color: #909399">+{{ row.items.length - 3 }}</span>
          </template>
          <span v-else style="color: #909399">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column prop="enabled" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
            {{ row.enabled ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </x-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑字典' : '新增字典'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="字典名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入字典名称" />
        </el-form-item>
        <el-form-item label="字典编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入字典编码" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="dict">数据字典</el-radio>
            <el-radio value="system">系统配置</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.type === 'system'" label="字典值" prop="value">
          <el-input v-model="form.value" placeholder="请输入配置值" />
        </el-form-item>
        <el-form-item v-if="form.type === 'dict'" label="字典项" prop="items">
          <div class="dict-items-editor">
            <div v-for="(item, index) in form.items" :key="index" class="dict-item-row">
              <el-input v-model="item.label" placeholder="标签" style="width: 100px" />
              <el-input v-model="item.value" placeholder="值" style="width: 100px" />
              <el-input v-model.number="item.sort" placeholder="排序" style="width: 80px" type="number" />
              <el-button type="danger" link @click="removeItem(index)">删除</el-button>
            </div>
            <el-button type="primary" link @click="addItem">+ 添加字典项</el-button>
          </div>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="请输入描述" />
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
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDicts, createDict, updateDict, deleteDict, type Dict, type DictItem } from '../runtime/api/dict'

const loading = ref(false)
const tableData = ref<Dict[]>([])
const filterType = ref<string>('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const defaultForm = {
  name: '',
  code: '',
  type: 'dict' as 'dict' | 'system',
  value: '',
  items: [] as DictItem[],
  sort: 0,
  description: '',
  enabled: true,
}

const form = reactive({ ...defaultForm })

const rules = {
  name: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入字典编码', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

async function fetchData() {
  loading.value = true
  try {
    const res = filterType.value
      ? await getDicts(filterType.value)
      : await getDicts()
    if (res.success) {
      tableData.value = res.data
    }
  } catch (e) {
    ElMessage.error('加载字典失败')
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  isEdit.value = false
  Object.assign(form, defaultForm)
  dialogVisible.value = true
}

function handleEdit(row: Dict) {
  isEdit.value = true
  Object.assign(form, {
    name: row.name,
    code: row.code,
    type: row.type,
    value: row.value || '',
    items: row.items ? [...row.items] : [],
    sort: row.sort,
    description: row.description || '',
    enabled: row.enabled,
  })
  dialogVisible.value = true
}

async function handleDelete(row: Dict) {
  try {
    await ElMessageBox.confirm(`确定删除字典"${row.name}"？`, '提示', { type: 'warning' })
    const res = await deleteDict(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      fetchData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

function addItem() {
  form.items.push({ label: '', value: '', sort: form.items.length + 1 })
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const submitData = {
      name: form.name,
      code: form.code,
      type: form.type,
      value: form.type === 'system' ? form.value : undefined,
      items: form.type === 'dict' ? form.items : undefined,
      sort: form.sort,
      description: form.description || undefined,
      enabled: form.enabled,
    }

    const res = isEdit.value
      ? await updateDict((form as any).id || (tableData.value.find(t => t.code === form.code) as any)?.id, submitData)
      : await createDict(submitData)

    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 初始化时找 id
watch(dialogVisible, async (val) => {
  if (val && isEdit.value && !(form as any).id) {
    const row = tableData.value.find(t => t.code === form.code)
    if (row) {
      ;(form as any).id = row.id
    }
  }
})

import { watch } from 'vue'

fetchData()
</script>

<style scoped>
.dict-page {
  max-width: 1200px;
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

.dict-items-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dict-item-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
