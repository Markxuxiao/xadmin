<template>
  <div class="audit-log-page">
    <div class="page-header">
      <h2>操作日志</h2>
    </div>

    <x-table
      :loading="loading"
      :data="tableData"
      :empty="!loading && tableData.length === 0"
      empty-text="暂无操作日志"
    >
      <template #toolbar>
        <el-select v-model="filters.action" placeholder="操作类型" clearable style="width: 120px" @change="fetchData">
          <el-option label="查询" value="query" />
          <el-option label="创建" value="create" />
          <el-option label="更新" value="update" />
          <el-option label="删除" value="delete" />
        </el-select>
        <el-select v-model="filters.entity" placeholder="实体类型" clearable style="width: 120px" @change="fetchData">
          <el-option label="用户" value="User" />
          <el-option label="角色" value="Role" />
          <el-option label="字典" value="Dict" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="handleDateChange"
        />
      </template>

      <el-table-column prop="action" label="操作" width="100">
        <template #default="{ row }">
          <el-tag :type="actionType(row.action)" size="small">
            {{ actionLabel(row.action) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="entity" label="实体" width="100" />
      <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
      <el-table-column prop="operatorName" label="操作人" width="100" />
      <el-table-column prop="path" label="请求路径" min-width="150" show-overflow-tooltip />
      <el-table-column prop="method" label="方法" width="80">
        <template #default="{ row }">
          <el-tag :type="methodType(row.method)" size="small">{{ row.method }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="statusCode" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.statusCode >= 400 ? 'danger' : 'success'" size="small">
            {{ row.statusCode }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="ip" label="IP地址" width="130" />
      <el-table-column prop="createdAt" label="操作时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </x-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="日志详情" width="700px">
      <el-descriptions :column="2" border v-if="currentLog">
        <el-descriptions-item label="操作类型">{{ actionLabel(currentLog.action) }}</el-descriptions-item>
        <el-descriptions-item label="实体类型">{{ currentLog.entity }}</el-descriptions-item>
        <el-descriptions-item label="操作人">{{ currentLog.operatorName }}</el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ currentLog.ip || '-' }}</el-descriptions-item>
        <el-descriptions-item label="请求路径" :span="2">{{ currentLog.path }}</el-descriptions-item>
        <el-descriptions-item label="请求方法">{{ currentLog.method }}</el-descriptions-item>
        <el-descriptions-item label="状态码">
          <el-tag :type="currentLog.statusCode >= 400 ? 'danger' : 'success'" size="small">
            {{ currentLog.statusCode }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作时间" :span="2">{{ formatDate(currentLog.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="请求参数" :span="2">
          <pre v-if="currentLog.requestBody" class="code-block">{{ JSON.stringify(currentLog.requestBody, null, 2) }}</pre>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2" v-if="currentLog.error">
          <span class="error-text">{{ currentLog.error }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAuditLogs, type AuditLog } from '../runtime/api/audit-log'

const loading = ref(false)
const tableData = ref<AuditLog[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const dateRange = ref<string[]>([])
const detailVisible = ref(false)
const currentLog = ref<AuditLog | null>(null)

const filters = reactive({
  action: '',
  entity: '',
  startDate: '',
  endDate: '',
})

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    query: '查询',
    create: '创建',
    update: '更新',
    delete: '删除',
    login: '登录',
    logout: '登出',
  }
  return map[action] || action
}

function actionType(action: string): string {
  const map: Record<string, any> = {
    query: 'info',
    create: 'success',
    update: 'warning',
    delete: 'danger',
    login: 'primary',
    logout: 'info',
  }
  return map[action] || 'info'
}

function methodType(method: string): string {
  const map: Record<string, any> = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'warning',
  }
  return map[method] || 'info'
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
    second: '2-digit',
  })
}

function handleDateChange(val: string[]) {
  if (val && val.length === 2) {
    filters.startDate = val[0]
    filters.endDate = val[1]
  } else {
    filters.startDate = ''
    filters.endDate = ''
  }
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getAuditLogs({
      action: filters.action || undefined,
      entity: filters.entity || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
    })
    if (res.success) {
      tableData.value = res.data.data
      total.value = res.data.total
    }
  } catch (e) {
    ElMessage.error('加载日志失败')
  } finally {
    loading.value = false
  }
}

function showDetail(row: AuditLog) {
  currentLog.value = row
  detailVisible.value = true
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.audit-log-page {
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

.code-block {
  background: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  margin: 0;
}

.error-text {
  color: #f56c6c;
}
</style>
