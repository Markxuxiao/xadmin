import { Entity, Filter, PrimaryKey, Property } from '@mikro-orm/core'

// ============================================================================
// Backward-compatible types (used by existing services until Phase 2)
// ============================================================================

export interface UserRow {
  id: string
  username: string
  password: string
  nickname: string
  avatar: string | null
  roles: string
  permissions: string
  enabled: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export function rowToUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatar: row.avatar,
    roles: JSON.parse(row.roles),
    permissions: JSON.parse(row.permissions),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// MikroORM Entity (replaces raw SQL in Phase 2)
// Note: esbuild does not support emitDecoratorMetadata, so all property types
// must be specified explicitly in the decorator options.
// ============================================================================

/**
 * Soft-delete filter — auto-excludes soft-deleted users from all queries.
 * Usage in services:
 *   em.find(User, {}, { filter: ['soft-delete'] })
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class User {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ type: 'string' })
  username!: string

  @Property({ type: 'string' })
  password!: string

  @Property({ type: 'string' })
  nickname!: string

  @Property({ type: 'string', nullable: true })
  avatar!: string | null

  @Property({ type: 'string' })
  roles!: string

  @Property({ type: 'string' })
  permissions!: string

  @Property({ type: 'boolean' })
  enabled!: boolean

  @Property({ type: 'Date', fieldName: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ type: 'Date', fieldName: 'updated_at', defaultRaw: 'NOW()' })
  updatedAt!: Date

  @Property({ type: 'Date', fieldName: 'deleted_at', nullable: true })
  deletedAt!: Date | null

  @Property({ type: 'number', fieldName: 'version', default: 1 })
  version!: number
}
