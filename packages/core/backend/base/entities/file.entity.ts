import { Entity, Filter, PrimaryKey, Property } from '@mikro-orm/core'

/**
 * 文件实体
 * 存储上传的文件元数据
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class FileRecord {
  @PrimaryKey()
  id!: string

  /** 文件原始名称 */
  @Property()
  originalName!: string

  /** 存储文件名 (UUID + 扩展名) */
  @Property()
  storedName!: string

  /** 文件扩展名 */
  @Property()
  extension!: string

  /** 文件 MIME 类型 */
  @Property()
  mimeType!: string

  /** 文件大小 (字节) */
  @Property()
  size!: number

  /** 存储路径 */
  @Property()
  path!: string

  /** 文件分类: avatar | attachment | image | document */
  @Property()
  category!: string

  /** 上传者 ID */
  @Property()
  uploaderId!: string

  /** 上传者用户名 */
  @Property()
  uploaderName!: string

  /** 引用次数 (用于判断是否可删除) */
  @Property({ default: 0 })
  refCount!: number

  /** 描述 */
  @Property({ nullable: true })
  description!: string | null

  @Property({ field: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ field: 'updated_at', defaultRaw: 'NOW()', onUpdate: () => 'NOW()' })
  updatedAt!: Date

  @Property({ field: 'deleted_at', nullable: true })
  deletedAt!: Date | null
}

// ============================================================================
// Backward-compatible types
// ============================================================================

export interface FileRecordRow {
  id: string
  originalName: string
  storedName: string
  extension: string
  mimeType: string
  size: number
  path: string
  category: string
  uploaderId: string
  uploaderName: string
  refCount: number
  description: string | null
  created_at: string
  updated_at: string
}

export function rowToFileRecord(row: FileRecordRow) {
  return {
    id: row.id,
    originalName: row.originalName,
    storedName: row.storedName,
    extension: row.extension,
    mimeType: row.mimeType,
    size: row.size,
    path: row.path,
    category: row.category,
    uploaderId: row.uploaderId,
    uploaderName: row.uploaderName,
    refCount: row.refCount,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
