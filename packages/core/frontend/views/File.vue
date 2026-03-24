<template>
  <div class="file-page">
    <div class="page-header">
      <h2>文件管理</h2>
    </div>

    <x-table
      :loading="loading"
      :data="tableData"
      :empty="!loading && tableData.length === 0"
      empty-text="暂无文件"
    >
      <template #toolbar>
        <el-select v-model="filterCategory" placeholder="文件分类" clearable style="width: 120px" @change="fetchData">
          <el-option label="头像" value="avatar" />
          <el-option label="图片" value="image" />
          <el-option label="附件" value="attachment" />
          <el-option label="文档" value="document" />
        </el-select>
        <el-button type="primary" @click="showUploadDialog = true">上传文件</el-button>
      </template>

      <el-table-column label="文件" min-width="200">
        <template #default="{ row }">
          <div class="file-cell">
            <el-icon v-if="isImage(row.mimeType)" class="file-icon image"><Picture /></el-icon>
            <el-icon v-else class="file-icon"><Document /></el-icon>
            <div class="file-info">
              <span class="file-name">{{ row.originalName }}</span>
              <span class="file-ext">.{{ row.extension.replace('.', '') }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ categoryLabel(row.category) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="大小" width="100">
        <template #default="{ row }">
          {{ formatSize(row.size) }}
        </template>
      </el-table-column>
      <el-table-column prop="mimeType" label="类型" width="120" show-overflow-tooltip />
      <el-table-column prop="uploaderName" label="上传者" width="100" />
      <el-table-column prop="refCount" label="引用" width="80">
        <template #default="{ row }">
          <el-tag :type="row.refCount > 0 ? 'info' : 'success'" size="small">
            {{ row.refCount }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="上传时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="previewFile(row)">预览</el-button>
          <el-button type="primary" link size="small" @click="copyUrl(row)">复制</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)" :disabled="row.refCount > 0">删除</el-button>
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

    <!-- 上传弹窗 -->
    <el-dialog v-model="showUploadDialog" title="上传文件" width="500px">
      <x-upload
        category="attachment"
        :show-file-list="true"
        :multiple="true"
        @success="handleUploadSuccess"
      />
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="showPreviewDialog" title="文件预览" width="600px">
      <div v-if="previewFileData" class="preview-content">
        <img v-if="isImage(previewFileData.mimeType)" :src="previewFileData.url" :alt="previewFileData.originalName" />
        <div v-else class="preview-other">
          <el-icon size="80"><Document /></el-icon>
          <p>{{ previewFileData.originalName }}</p>
          <p class="preview-hint">此文件类型不支持在线预览</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture, Document } from '@element-plus/icons-vue'
import { getFiles, deleteFile, type FileRecord } from '../runtime/api/file'

const loading = ref(false)
const tableData = ref<FileRecord[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterCategory = ref('')
const showUploadDialog = ref(false)
const showPreviewDialog = ref(false)
const previewFileData = ref<FileRecord | null>(null)

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    avatar: '头像',
    image: '图片',
    attachment: '附件',
    document: '文档',
  }
  return map[category] || category
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
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

async function fetchData() {
  loading.value = true
  try {
    const res = await getFiles({
      category: filterCategory.value || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
    })
    if (res.success) {
      tableData.value = res.data.data
      total.value = res.data.total
    }
  } catch (e) {
    ElMessage.error('加载文件列表失败')
  } finally {
    loading.value = false
  }
}

function previewFile(row: FileRecord) {
  previewFileData.value = row
  showPreviewDialog.value = true
}

function copyUrl(row: FileRecord) {
  navigator.clipboard.writeText(row.url).then(() => {
    ElMessage.success('链接已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

async function handleDelete(row: FileRecord) {
  try {
    await ElMessageBox.confirm(`确定删除文件"${row.originalName}"？`, '提示', { type: 'warning' })
    const res = await deleteFile(row.id)
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

function handleUploadSuccess(files: FileRecord[]) {
  showUploadDialog.value = false
  ElMessage.success(`成功上传 ${files.length} 个文件`)
  fetchData()
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.file-page {
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

.file-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 24px;
  color: #909399;
}

.file-icon.image {
  color: #409eff;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-ext {
  color: #909399;
  font-size: 12px;
}

.preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-content img {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
}

.preview-other {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #606266;
}

.preview-hint {
  font-size: 12px;
  color: #909399;
}
</style>
