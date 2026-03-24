import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { getOrm, Notification, NotificationType } from '../../base'

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

export interface NotificationRow {
  id: string
  title: string
  content: string
  type: string
  isRead: number
  userId: string
  userName: string
  senderId: string | null
  senderName: string | null
  link: string | null
  extra: string | null
  createdAt: string
  updatedAt: string
}

@Injectable()
export class NotificationService {
  /**
   * 发送通知
   */
  async send(dto: SendNotificationDto): Promise<NotificationRow> {
    const em = getOrm().em.fork()
    const now = new Date()

    const notification = em.create(Notification, {
      id: crypto.randomUUID(),
      title: dto.title,
      content: dto.content,
      type: dto.type,
      isRead: false,
      userId: dto.userId,
      userName: dto.userName,
      senderId: dto.senderId ?? null,
      senderName: dto.senderName ?? null,
      link: dto.link ?? null,
      extra: dto.extra ? JSON.stringify(dto.extra) : null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })

    await em.persistAndFlush(notification)
    return this.toRow(notification)
  }

  /**
   * 批量发送通知
   */
  async sendBatch(dtos: SendNotificationDto[]): Promise<NotificationRow[]> {
    const em = getOrm().em.fork()
    const now = new Date()

    const notifications = dtos.map(dto =>
      em.create(Notification, {
        id: crypto.randomUUID(),
        title: dto.title,
        content: dto.content,
        type: dto.type,
        isRead: false,
        userId: dto.userId,
        userName: dto.userName,
        senderId: dto.senderId ?? null,
        senderName: dto.senderName ?? null,
        link: dto.link ?? null,
        extra: dto.extra ? JSON.stringify(dto.extra) : null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        version: 1,
      })
    )

    await em.persistAndFlush(notifications)
    return notifications.map(n => this.toRow(n))
  }

  /**
   * 获取用户的所有通知（分页）
   */
  async findByUser(userId: string, params: {
    page?: number
    pageSize?: number
    type?: string
    isRead?: boolean
  } = {}): Promise<{ data: NotificationRow[]; total: number; page: number; pageSize: number }> {
    const em = getOrm().em.fork()
    const where: any = { userId }

    if (params.type) where.type = params.type
    if (params.isRead !== undefined) where.isRead = params.isRead

    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const offset = (page - 1) * pageSize

    const [notifications, total] = await em.findAndCount(Notification, where, {
      filters: ['soft-delete'],
      orderBy: { createdAt: 'DESC' },
      limit: pageSize,
      offset,
    })

    return {
      data: notifications.map(n => this.toRow(n)),
      total,
      page,
      pageSize,
    }
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    const em = getOrm().em.fork()
    const count = await em.count(Notification, { userId, isRead: false })
    return count
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(id: string, userId: string): Promise<boolean> {
    const em = getOrm().em.fork()
    const notification = await em.findOne(Notification, { id, userId })
    if (!notification) return false

    notification.isRead = true
    notification.updatedAt = new Date()
    await em.flush()
    return true
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    const em = getOrm().em.fork()
    const notifications = await em.find(Notification, { userId, isRead: false })
    if (notifications.length === 0) return 0

    const now = new Date()
    notifications.forEach(n => {
      n.isRead = true
      n.updatedAt = now
    })
    await em.flush()
    return notifications.length
  }

  /**
   * 删除通知（软删除）
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const em = getOrm().em.fork()
    const notification = await em.findOne(Notification, { id, userId })
    if (!notification) return false

    notification.deletedAt = new Date()
    await em.flush()
    return true
  }

  /**
   * 获取单个通知
   */
  async findOne(id: string, userId: string): Promise<NotificationRow | null> {
    const em = getOrm().em.fork()
    const notification = await em.findOne(Notification, { id, userId }, {
      filters: ['soft-delete'],
    })
    return notification ? this.toRow(notification) : null
  }

  private toRow(n: Notification): NotificationRow {
    return {
      id: n.id,
      title: n.title,
      content: n.content,
      type: n.type,
      isRead: n.isRead ? 1 : 0,
      userId: n.userId,
      userName: n.userName,
      senderId: n.senderId,
      senderName: n.senderName,
      link: n.link,
      extra: n.extra,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
      updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : String(n.updatedAt),
    }
  }
}
