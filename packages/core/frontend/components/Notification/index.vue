<template>
  <el-popover
    ref="popoverRef"
    placement="bottom-end"
    :width="360"
    trigger="click"
    @show="handleShow"
  >
    <template #reference>
      <div class="notification-bell">
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
          <el-icon class="bell-icon"><Bell /></el-icon>
        </el-badge>
      </div>
    </template>

    <div class="notification-panel">
      <div class="notification-header">
        <span class="header-title">通知中心</span>
        <el-button
          v-if="unreadCount > 0"
          type="primary"
          link
          size="small"
          @click="handleMarkAllRead"
        >
          全部已读
        </el-button>
      </div>

      <div class="notification-tabs">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="全部" name="all" />
          <el-tab-pane label="未读" name="unread" />
        </el-tabs>
      </div>

      <div class="notification-list" v-loading="loading">
        <template v-if="notifications.length > 0">
          <div
            v-for="item in notifications"
            :key="item.id"
            class="notification-item"
            :class="{ 'is-read': item.isRead }"
            @click="handleItemClick(item)"
          >
            <div class="item-icon">
              <el-icon :class="getTypeClass(item.type)">
                <component :is="getTypeIcon(item.type)" />
              </el-icon>
            </div>
            <div class="item-content">
              <div class="item-title">{{ item.title }}</div>
              <div class="item-desc">{{ item.content }}</div>
              <div class="item-time">{{ formatTime(item.createdAt) }}</div>
            </div>
            <div class="item-actions" v-if="!item.isRead">
              <el-button type="primary" link size="small" @click.stop="handleMarkRead(item.id)">
                已读
              </el-button>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无通知" :image-size="80" />
      </div>

      <div class="notification-footer" v-if="total > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          small
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Bell, Message, Check, Warning, Info, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type NotificationRecord
} from '../../runtime/api/notification'
import { useUserStore } from '../../runtime/stores/user'

const userStore = useUserStore()
const popoverRef = ref()
const loading = ref(false)
const notifications = ref<NotificationRecord[]>([])
const unreadCount = ref(0)
const activeTab = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const typeIcons: Record<string, string> = {
  system: 'Info',
  user: 'Message',
  task: 'Check',
  approval: 'Warning',
  message: 'Document',
}

function getTypeIcon(type: string) {
  return typeIcons[type] || 'Bell'
}

function getTypeClass(type: string): string {
  return `type-${type}`
}

function formatTime(timeStr: string): string {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleDateString()
}

async function fetchUnreadCount() {
  try {
    const res = await getUnreadCount()
    if (res.success) {
      unreadCount.value = res.data
    }
  } catch (e) {
    console.error('[Notification] Failed to fetch unread count:', e)
  }
}

async function fetchNotifications() {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (activeTab.value === 'unread') {
      params.isRead = false
    }

    const res = await getNotifications(params)
    if (res.success) {
      notifications.value = res.data.data
      total.value = res.data.total
    }
  } catch (e) {
    console.error('[Notification] Failed to fetch notifications:', e)
  } finally {
    loading.value = false
  }
}

function handleShow() {
  currentPage.value = 1
  fetchNotifications()
}

function handleTabChange() {
  currentPage.value = 1
  fetchNotifications()
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchNotifications()
}

async function handleMarkRead(id: string) {
  try {
    const res = await markAsRead(id)
    if (res.success) {
      const item = notifications.value.find(n => n.id === id)
      if (item) item.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  } catch (e) {
    console.error('[Notification] Failed to mark as read:', e)
  }
}

async function handleMarkAllRead() {
  try {
    const res = await markAllAsRead()
    if (res.success) {
      notifications.value.forEach(n => { n.isRead = true })
      unreadCount.value = 0
      ElMessage.success('已全部标记为已读')
    }
  } catch (e) {
    console.error('[Notification] Failed to mark all as read:', e)
  }
}

function handleItemClick(item: NotificationRecord) {
  if (!item.isRead) {
    handleMarkRead(item.id)
  }
  if (item.link) {
    window.location.href = item.link
  }
}

// 初始化时获取未读数
onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchUnreadCount()
  }
})

defineExpose({
  fetchUnreadCount,
})
</script>

<style scoped>
.notification-bell {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 200ms;
}

.notification-bell:hover {
  background-color: #f5f7fa;
}

.bell-icon {
  font-size: 20px;
  color: #606266;
}

.notification-panel {
  margin: -12px;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e6e6e6;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.notification-tabs {
  padding: 0 16px;
}

:deep(.el-tabs__header) {
  margin: 0;
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
  min-height: 100px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 150ms;
  border-bottom: 1px solid #f0f0f0;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background-color: #f5f7fa;
}

.notification-item.is-read {
  opacity: 0.6;
}

.item-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f0f0f0;
  margin-right: 12px;
}

.item-icon .el-icon {
  font-size: 18px;
}

.type-system .item-icon {
  background-color: #e6f7ff;
  color: #1890ff;
}

.type-user .item-icon {
  background-color: #f6ffed;
  color: #52c41a;
}

.type-task .item-icon {
  background-color: #fff7e6;
  color: #faad14;
}

.type-approval .item-icon {
  background-color: #fff1f0;
  color: #ff4d4f;
}

.type-message .item-icon {
  background-color: #f9f0ff;
  color: #722ed1;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-desc {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.item-time {
  font-size: 12px;
  color: #c0c4cc;
}

.item-actions {
  flex-shrink: 0;
  margin-left: 8px;
}

.notification-footer {
  display: flex;
  justify-content: center;
  padding: 8px;
  border-top: 1px solid #e6e6e6;
}
</style>
