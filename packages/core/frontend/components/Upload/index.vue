<template>
  <div class="x-upload">
    <el-upload
      ref="uploadRef"
      :action="action"
      :headers="headers"
      :before-upload="handleBeforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-remove="handleRemove"
      :file-list="fileList"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      :limit="limit"
      :on-exceed="handleExceed"
      drag
    >
      <div class="upload-content">
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div class="upload-text">
          <span>将文件拖到此处，或 <em>点击上传</em></span>
          <p class="upload-hint">{{ hint }}</p>
        </div>
      </div>
    </el-upload>

    <div v-if="showFileList && uploadedFiles.length > 0" class="uploaded-list">
      <div v-for="file in uploadedFiles" :key="file.id" class="uploaded-item">
        <el-icon v-if="isImage(file.mimeType)" class="file-icon"><Picture /></el-icon>
        <el-icon v-else class="file-icon"><Document /></el-icon>
        <span class="file-name">{{ file.originalName }}</span>
        <span class="file-size">{{ formatSize(file.size) }}</span>
        <el-button type="danger" link size="small" @click="removeFile(file)">删除</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Picture, Document } from '@element-plus/icons-vue'
import { uploadFile, deleteFile, type FileRecord } from '../../runtime/api/file'
import { useUserStore } from '../../runtime/stores/user'

interface Props {
  action?: string  // 如果不提供，使用自定义上传
  accept?: string
  multiple?: boolean
  disabled?: boolean
  limit?: number
  category?: string
  showFileList?: boolean
  maxSize?: number  // MB
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  action: '',  // 空字符串表示使用自定义上传
  accept: '*',
  multiple: false,
  disabled: false,
  limit: 10,
  category: 'attachment',
  showFileList: true,
  maxSize: 10,
  hint: '单个文件不超过 10MB',
})

const emit = defineEmits<{
  (e: 'success', file: FileRecord): void
  (e: 'success', files: FileRecord[]): void
  (e: 'error', message: string): void
  (e: 'remove', file: FileRecord): void
}>()

const uploadRef = ref()
const uploadedFiles = ref<FileRecord[]>([])
const userStore = useUserStore()

const headers = computed(() => ({
  Authorization: `Bearer ${userStore.token}`,
}))

const fileList = ref<any[]>([])

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

async function handleBeforeUpload(file: File) {
  // 检查文件大小
  if (file.size > props.maxSize * 1024 * 1024) {
    ElMessage.error(`文件大小不能超过 ${props.maxSize}MB`)
    return false
  }
  return true
}

async function handleSuccess(response: any, file: any) {
  if (response.success && response.data) {
    const fileRecord = response.data as FileRecord
    uploadedFiles.value.push(fileRecord)
    emit('success', props.multiple ? uploadedFiles.value : fileRecord)
    ElMessage.success('上传成功')
  } else {
    emit('error', response.message || '上传失败')
    ElMessage.error(response.message || '上传失败')
    // 从列表中移除
    const idx = fileList.value.findIndex(f => f.uid === file.uid)
    if (idx !== -1) fileList.value.splice(idx, 1)
  }
}

function handleError(err: any, file: any) {
  emit('error', err.message || '上传失败')
  ElMessage.error(err.message || '上传失败')
  const idx = fileList.value.findIndex(f => f.uid === file.uid)
  if (idx !== -1) fileList.value.splice(idx, 1)
}

function handleRemove(file: any) {
  const idx = fileList.value.findIndex(f => f.uid === file.uid)
  if (idx !== -1) fileList.value.splice(idx, 1)
}

function handleExceed() {
  ElMessage.warning(`最多只能上传 ${props.limit} 个文件`)
}

async function removeFile(file: FileRecord) {
  try {
    const res = await deleteFile(file.id)
    if (res.success) {
      const idx = uploadedFiles.value.findIndex(f => f.id === file.id)
      if (idx !== -1) uploadedFiles.value.splice(idx, 1)
      emit('remove', file)
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

// 暴露方法供父组件调用
function triggerUpload() {
  const uploadInput = uploadRef.value?.$el?.querySelector('input[type="file"]')
  if (uploadInput) uploadInput.click()
}

defineExpose({
  uploadedFiles,
  triggerUpload,
  removeFile,
})
</script>

<style scoped>
.x-upload {
  width: 100%;
}

.upload-content {
  padding: 32px 0;
}

.upload-icon {
  font-size: 48px;
  color: #909399;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 14px;
  color: #606266;
}

.upload-text em {
  color: #409eff;
  font-style: normal;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.uploaded-list {
  margin-top: 16px;
}

.uploaded-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.file-icon {
  font-size: 20px;
  color: #909399;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #909399;
  font-size: 12px;
}
</style>
