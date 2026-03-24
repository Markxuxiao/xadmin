import { Entity, Filter, PrimaryKey, Property } from '@mikro-orm/core'

/**
 * 操作日志实体
 * 记录用户的 CRUD 操作和登录日志
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class AuditLog {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  /** 操作类型: create | update | delete | login | logout | query */
  @Property({ type: 'string' })
  action!: string

  /** 操作的实体类型，如 User, Role, Dict */
  @Property({ type: 'string' })
  entity!: string

  /** 操作的实体 ID */
  @Property({ type: 'string', nullable: true })
  entityId!: string | null

  /** 操作人 ID */
  @Property({ type: 'string' })
  operatorId!: string

  /** 操作人用户名 */
  @Property({ type: 'string' })
  operatorName!: string

  /** 请求路径 */
  @Property({ type: 'string' })
  path!: string

  /** 请求方法 */
  @Property({ type: 'string' })
  method!: string

  /** 请求参数 (JSON) */
  @Property({ type: 'text', nullable: true })
  requestBody!: string | null

  /** 响应状态码 */
  @Property({ type: 'number' })
  statusCode!: number

  /** 响应结果 */
  @Property({ type: 'text', nullable: true })
  responseBody!: string | null

  /** IP 地址 */
  @Property({ type: 'string', nullable: true })
  ip!: string | null

  /** User-Agent */
  @Property({ type: 'string', nullable: true })
  userAgent!: string | null

  /** 错误信息 (如果有) */
  @Property({ type: 'text', nullable: true })
  error!: string | null

  /** 操作描述 */
  @Property({ type: 'string', nullable: true })
  description!: string | null

  @Property({ type: 'Date', field: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ type: 'Date', field: 'deleted_at', nullable: true })
  deletedAt!: Date | null
}

// ============================================================================
// Backward-compatible types
// ============================================================================

export interface AuditLogRow {
  id: string
  action: string
  entity: string
  entityId: string | null
  operatorId: string
  operatorName: string
  path: string
  method: string
  requestBody: string | null
  statusCode: number
  responseBody: string | null
  ip: string | null
  userAgent: string | null
  error: string | null
  description: string | null
  created_at: string
}

export function rowToAuditLog(row: AuditLogRow) {
  return {
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    operatorId: row.operatorId,
    operatorName: row.operatorName,
    path: row.path,
    method: row.method,
    requestBody: row.requestBody ? JSON.parse(row.requestBody) : null,
    statusCode: row.statusCode,
    responseBody: row.responseBody,
    ip: row.ip,
    userAgent: row.userAgent,
    error: row.error,
    description: row.description,
    createdAt: row.created_at,
  }
}
