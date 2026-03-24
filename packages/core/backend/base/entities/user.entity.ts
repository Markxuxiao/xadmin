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
// ============================================================================

/**
 * Soft-delete filter — auto-excludes soft-deleted users from all queries.
 * Usage in services:
 *   em.find(User, {}, { filter: ['soft-delete'] })
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class User {
  @PrimaryKey()
  id!: string

  @Property()
  username!: string

  @Property()
  password!: string

  @Property()
  nickname!: string

  @Property({ nullable: true })
  avatar!: string | null

  @Property()
  roles!: string

  @Property()
  permissions!: string

  @Property()
  enabled!: boolean

  @Property({ field: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ field: 'updated_at', defaultRaw: 'NOW()' })
  updatedAt!: Date

  @Property({ field: 'deleted_at', nullable: true })
  deletedAt!: Date | null

  @Property({ field: 'version', default: 1 })
  version!: number
}
