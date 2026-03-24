// Notification API
import client, { ApiResponse } from './client'

export interface NotificationRecord {
  id: string
  title: string
  content: string
  type: string
  isRead: boolean
  userId: string
  userName: string
  senderId: string | null
  senderName: string | null
  link: string | null
  extra: Record<string, any> | null
  createdAt: string
  updatedAt: string
}

export interface SendNotificationDto {
  title: string
  content: string
  type: string
  userId: string
  userName: string
  senderId?: string
  senderName?: string
  link?: string
  extra?: Record<string, any>
}

export interface NotificationListResponse {
  data: NotificationRecord[]
  total: number
  page: number
  pageSize: number
}

/**
 * 获取通知列表
 */
export async function getNotifications(params: {
  page?: number
  pageSize?: number
  type?: string
  isRead?: boolean
}): Promise<ApiResponse<NotificationListResponse>> {
  const res = await client.get('/notification', { params })
  return res.data
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(): Promise<ApiResponse<number>> {
  const res = await client.get<ApiResponse<number>>('/notification/unread-count')
  return res.data
}

/**
 * 获取单个通知
 */
export async function getNotification(id: string): Promise<ApiResponse<NotificationRecord>> {
  const res = await client.get<ApiResponse<NotificationRecord>>(`/notification/${id}`)
  return res.data
}

/**
 * 发送通知
 */
export async function sendNotification(
  dto: SendNotificationDto
): Promise<ApiResponse<NotificationRecord>> {
  const res = await client.post<ApiResponse<NotificationRecord>>('/notification', dto)
  return res.data
}

/**
 * 批量发送通知
 */
export async function sendNotificationBatch(
  dtos: SendNotificationDto[]
): Promise<ApiResponse<NotificationRecord[]>> {
  const res = await client.post<ApiResponse<NotificationRecord[]>>('/notification/batch', dtos)
  return res.data
}

/**
 * 标记通知为已读
 */
export async function markAsRead(id: string): Promise<ApiResponse<void>> {
  const res = await client.put<ApiResponse<void>>(`/notification/${id}/read`)
  return res.data
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(): Promise<ApiResponse<number>> {
  const res = await client.put<ApiResponse<number>>('/notification/read-all')
  return res.data
}

/**
 * 删除通知
 */
export async function deleteNotification(id: string): Promise<ApiResponse<void>> {
  const res = await client.delete<ApiResponse<void>>(`/notification/${id}`)
  return res.data
}
