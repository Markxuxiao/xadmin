import { Entity, Filter, PrimaryKey, Property, Unique } from '@mikro-orm/core'

// ============================================================================
// Backward-compatible types (used by existing services until Phase 2)
// ============================================================================

export interface RoleRow {
  id: string
  name: string
  code: string
  description: string | null
  permissions: string
  enabled: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export function rowToRole(row: RoleRow) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
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
 * Soft-delete filter — auto-excludes soft-deleted roles from all queries.
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class Role {
  @PrimaryKey()
  id!: string

  @Property()
  name!: string

  @Unique()
  @Property()
  code!: string

  @Property({ nullable: true })
  description!: string | null

  @Property()
  permissions!: string

  @Property()
  enabled!: boolean

  @Property({ field: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ field: 'updated_at', defaultRaw: 'NOW()', onUpdate: () => 'NOW()' })
  updatedAt!: Date

  @Property({ field: 'deleted_at', nullable: true })
  deletedAt!: Date | null

  @Property({ field: 'version', default: 1 })
  version!: number
}
