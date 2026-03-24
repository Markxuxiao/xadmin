import { Entity, Filter, PrimaryKey, Property } from '@mikro-orm/core'

/**
 * 定时任务实体
 * 定义定时任务的配置和调度信息
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class ScheduledTask {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  /** 任务名称 */
  @Property({ type: 'string' })
  name!: string

  /** 任务描述 */
  @Property({ type: 'string', nullable: true })
  description!: string | null

  /** Cron 表达式 */
  @Property({ type: 'string' })
  cron!: string

  /** 任务处理器标识符 */
  @Property({ type: 'string' })
  handler!: string

  /** 是否启用 */
  @Property({ type: 'boolean' })
  enabled!: boolean

  /** 上次执行时间 */
  @Property({ type: 'Date', fieldName: 'last_executed_at', nullable: true })
  lastExecutedAt!: Date | null

  /** 上次执行结果 (success | failed) */
  @Property({ type: 'string', fieldName: 'last_executed_result', nullable: true })
  lastExecutedResult!: string | null

  /** 连续失败次数 */
  @Property({ type: 'number', fieldName: 'consecutive_failures', default: 0 })
  consecutiveFailures!: number

  /** 是否为内置任务 */
  @Property({ type: 'boolean', fieldName: 'is_builtin', default: false })
  isBuiltin!: boolean

  /** 任务参数 (JSON) */
  @Property({ type: 'text', nullable: true, fieldName: 'task_params' })
  taskParams!: string | null

  @Property({ type: 'Date', fieldName: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ type: 'Date', fieldName: 'updated_at', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt!: Date

  @Property({ type: 'Date', fieldName: 'deleted_at', nullable: true })
  deletedAt!: Date | null

  @Property({ type: 'number', fieldName: 'version', default: 1 })
  version!: number
}

// ============================================================================
// Backward-compatible types
// ============================================================================

export interface ScheduledTaskRow {
  id: string
  name: string
  description: string | null
  cron: string
  handler: string
  enabled: boolean
  lastExecutedAt: string | null
  lastExecutedResult: string | null
  consecutiveFailures: number
  isBuiltin: boolean
  taskParams: string | null
  createdAt: string
  updatedAt: string
}

export function rowToScheduledTask(row: ScheduledTaskRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cron: row.cron,
    handler: row.handler,
    enabled: row.enabled,
    lastExecutedAt: row.lastExecutedAt,
    lastExecutedResult: row.lastExecutedResult,
    consecutiveFailures: row.consecutiveFailures,
    isBuiltin: row.isBuiltin,
    taskParams: row.taskParams ? JSON.parse(row.taskParams) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
