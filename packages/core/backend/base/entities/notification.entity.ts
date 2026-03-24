import { Entity, Filter, PrimaryKey, Property } from '@mikro-orm/core'

/**
 * 通知类型枚举
 */
export enum NotificationType {
  /** 系统通知 */
  SYSTEM = 'system',
  /** 用户通知 */
  USER = 'user',
  /** 任务通知 */
  TASK = 'task',
  /** 审批通知 */
  APPROVAL = 'approval',
  /** 消息通知 */
  MESSAGE = 'message',
}

/**
 * 站内通知实体
 * 存储系统发送给用户的通知消息
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class Notification {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  /** 通知标题 */
  @Property({ type: 'string' })
  title!: string

  /** 通知内容 */
  @Property({ type: 'text' })
  content!: string

  /** 通知类型: system | user | task | approval | message */
  @Property({ type: 'string' })
  type!: string

  /** 是否已读 */
  @Property({ type: 'boolean', default: false })
  isRead!: boolean

  /** 目标用户 ID */
  @Property({ type: 'string' })
  userId!: string

  /** 目标用户名（冗余存储便于展示） */
  @Property({ type: 'string' })
  userName!: string

  /** 发送者 ID（可选，系统通知时为空） */
  @Property({ type: 'string', nullable: true })
  senderId!: string | null

  /** 发送者名称 */
  @Property({ type: 'string', nullable: true })
  senderName!: string | null

  /** 相关链接（可选，点击通知跳转） */
  @Property({ type: 'string', nullable: true })
  link!: string | null

  /** 扩展数据（JSON 格式存储额外信息） */
  @Property({ type: 'text', nullable: true })
  extra!: string | null

  @Property({ type: 'Date', fieldName: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ type: 'Date', fieldName: 'updated_at', defaultRaw: 'NOW()', onUpdate: () => 'NOW()' })
  updatedAt!: Date

  @Property({ type: 'Date', fieldName: 'deleted_at', nullable: true })
  deletedAt!: Date | null

  @Property({ type: 'number', fieldName: 'version', default: 1 })
  version!: number
}

// ============================================================================
// Backward-compatible types
// ============================================================================

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
  created_at: string
  updated_at: string
}

export function rowToNotification(row: NotificationRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    isRead: Boolean(row.isRead),
    userId: row.userId,
    userName: row.userName,
    senderId: row.senderId,
    senderName: row.senderName,
    link: row.link,
    extra: row.extra ? JSON.parse(row.extra) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
