import { Entity, Filter, PrimaryKey, Property } from '@mikro-orm/core'

/**
 * 数据字典实体
 * 用于存储系统配置和键值对数据
 *
 * 分类：
 * - system: 系统配置（如系统名称、Logo等）
 * - dict: 数据字典（如状态、类型等）
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class Dict {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  /** 字典名称 */
  @Property({ type: 'string' })
  name!: string

  /** 字典编码，唯一标识 */
  @Property({ type: 'string' })
  code!: string

  /** 字典类型：system | dict */
  @Property({ type: 'string' })
  type!: string

  /** 字典值（用于 system 类型） */
  @Property({ type: 'string', nullable: true })
  value!: string | null

  /** 字典项列表（JSON 数组，用于 dict 类型） */
  @Property({ type: 'text', nullable: true })
  items!: string | null

  /** 排序号 */
  @Property({ type: 'number' })
  sort!: number

  /** 描述 */
  @Property({ type: 'string', nullable: true })
  description!: string | null

  /** 是否启用 */
  @Property({ type: 'boolean' })
  enabled!: boolean

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

export interface DictRow {
  id: string
  name: string
  code: string
  type: string
  value: string | null
  items: string | null
  sort: number
  description: string | null
  enabled: number
  created_at: string
  updated_at: string
}

export interface DictItem {
  label: string
  value: string
  sort?: number
  enabled?: boolean
}

export function rowToDict(row: DictRow) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.type,
    value: row.value,
    items: row.items ? JSON.parse(row.items) : [],
    sort: row.sort,
    description: row.description,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
