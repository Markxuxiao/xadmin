<template>
  <div class="scheduled-task-page">
    <div class="page-header">
      <h2>定时任务管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleAdd">新增任务</el-button>
      </div>
    </div>

    <x-table
      :loading="loading"
      :data="tableData"
      :empty="!loading && tableData.length === 0"
      empty-text="暂无定时任务"
    >
      <template #toolbar>
        <el-select v-model="filterEnabled" placeholder="任务状态" clearable style="width: 120px" @change="fetchData">
          <el-option label="启用" :value="true" />
          <el-option label="禁用" :value="false" />
        </el-select>
      </template>

      <el-table-column prop="name" label="任务名称" min-width="150" />
      <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.description || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="cron" label="Cron表达式" width="150">
        <template #default="{ row }">
          <code class="cron-code">{{ row.cron }}</code>
        </template>
      </el-table-column>
      <el-table-column prop="handler" label="处理器" min-width="180">
        <template #default="{ row }">
          <el-tag size="small" :type="row.isBuiltin ? 'success' : 'default'">
            {{ row.isBuiltin ? '内置' : '自定义' }}
          </el-tag>
          <code class="handler-code">{{ row.handler }}</code>
        </template>
      </el-table-column>
      <el-table-column prop="enabled" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
            {{ row.enabled ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="lastExecutedAt" label="上次执行" width="160">
        <template #default="{ row }">
          {{ formatDate(row.lastExecutedAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="lastExecutedResult" label="执行结果" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.lastExecutedResult" :type="row.lastExecutedResult === 'success' ? 'success' : 'danger'" size="small">
            {{ row.lastExecutedResult === 'success' ? '成功' : '失败' }}
          </el-tag>
          <span v-else style="color: #909399">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="consecutiveFailures" label="连续失败" width="100">
        <template #default="{ row }">
          <span v-if="row.consecutiveFailures > 0" style="color: #f56c6c">{{ row.consecutiveFailures }}次</span>
          <span v-else style="color: #909399">-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="warning" link size="small" @click="handleTrigger(row)" :loading="triggeringId === row.id">
            触发
          </el-button>
          <el-button
            v-if="!row.isBuiltin"
            type="success"
            link
            size="small"
            @click="handleToggle(row)"
            :disabled="row.isBuiltin"
          >
            {{ row.enabled ? '禁用' : '启用' }}
          </el-button>
          <el-button
            v-if="!row.isBuiltin"
            type="danger"
            link
            size="small"
            @click="handleDelete(row)"
            :disabled="row.isBuiltin"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </x-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑任务' : '新增任务'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="请输入任务描述" />
        </el-form-item>
        <el-form-item label="Cron表达式" prop="cron">
          <el-input v-model="form.cron" placeholder="如: 0 0 * * * (每天凌晨)" />
          <div class="form-help">
            格式: 分 时 日 月 周 | 示例: <code>0 2 * * *</code> 每天凌晨2点
          </div>
        </el-form-item>
        <el-form-item label="处理器" prop="handler">
          <el-select v-model="form.handler" placeholder="选择任务处理器" style="width: 100%">
            <el-option label="清理旧日志" value="clean-old-audit-logs" />
            <el-option label="统计用户活跃" value="统计-daily-user-activity" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务参数" prop="taskParams">
          <el-input v-model="form.taskParamsJson" type="textarea" :rows="2" placeholder='JSON格式，如: {"days": 7}' />
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
import {
  getScheduledTasks,
  createScheduledTask,
  updateScheduledTask,
  deleteScheduledTask,
  enableScheduledTask,
  disableScheduledTask,
  triggerScheduledTask,
  type ScheduledTask,
} from '../runtime/api/scheduled-task'

const loading = ref(false)
const tableData = ref<ScheduledTask[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterEnabled = ref<boolean | ''>('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const triggeringId = ref<string | null>(null)
const formRef = ref()

const defaultForm = {
  name: '',
  description: '',
  cron: '',
  handler: '',
  enabled: true,
  taskParamsJson: '',
}

const form = reactive({ ...defaultForm })

const rules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  cron: [
    { required: true, message: '请输入Cron表达式', trigger: 'blur' },
    { pattern: /^[\d\*\/\-\,]+ ([\d\*\/\-\,]+ ){4}[\d\*\/\-\,]+$/, message: 'Cron表达式格式不正确', trigger: 'blur' },
  ],
  handler: [{ required: true, message: '请选择任务处理器', trigger: 'change' }],
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

async function fetchData() {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (filterEnabled.value !== '') {
      params.enabled = filterEnabled.value
    }
    const res = await getScheduledTasks(params)
    if (res.success) {
      tableData.value = res.data.data
      total.value = res.data.total
    }
  } catch (e) {
    ElMessage.error('加载任务失败')
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  isEdit.value = false
  Object.assign(form, defaultForm)
  dialogVisible.value = true
}

function handleEdit(row: ScheduledTask) {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    name: row.name,
    description: row.description || '',
    cron: row.cron,
    handler: row.handler,
    enabled: row.enabled,
    taskParamsJson: row.taskParams ? JSON.stringify(row.taskParams, null, 2) : '',
  })
  dialogVisible.value = true
}

async function handleDelete(row: ScheduledTask) {
  try {
    await ElMessageBox.confirm(`确定删除任务"${row.name}"？`, '提示', { type: 'warning' })
    const res = await deleteScheduledTask(row.id)
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

async function handleToggle(row: ScheduledTask) {
  try {
    const res = row.enabled ? await disableScheduledTask(row.id) : await enableScheduledTask(row.id)
    if (res.success) {
      ElMessage.success(row.enabled ? '禁用成功' : '启用成功')
      fetchData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function handleTrigger(row: ScheduledTask) {
  triggeringId.value = row.id
  try {
    const res = await triggerScheduledTask(row.id)
    if (res.success) {
      ElMessage.success('任务执行成功')
      fetchData()
    } else {
      ElMessage.error(res.message || '任务执行失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '任务执行失败')
  } finally {
    triggeringId.value = null
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const submitData: any = {
      name: form.name,
      description: form.description || undefined,
      cron: form.cron,
      handler: form.handler,
      enabled: form.enabled,
    }

    // 解析任务参数
    if (form.taskParamsJson.trim()) {
      try {
        submitData.taskParams = JSON.parse(form.taskParamsJson)
      } catch {
        ElMessage.error('任务参数JSON格式不正确')
        submitting.value = false
        return
      }
    }

    const res = isEdit.value
      ? await updateScheduledTask((form as any).id, submitData)
      : await createScheduledTask(submitData)

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

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.scheduled-task-page {
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

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.cron-code {
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  color: #409eff;
}

.handler-code {
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  color: #67c23a;
}

.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.form-help code {
  background: #f5f7fa;
  padding: 2px 4px;
  border-radius: 2px;
  color: #409eff;
}
</style>
