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
// Note: esbuild does not support emitDecoratorMetadata, so all property types
// must be specified explicitly in the decorator options.
// ============================================================================

/**
 * Soft-delete filter — auto-excludes soft-deleted roles from all queries.
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class Role {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ type: 'string' })
  name!: string

  @Unique()
  @Property({ type: 'string' })
  code!: string

  @Property({ type: 'string', nullable: true })
  description!: string | null

  @Property({ type: 'string' })
  permissions!: string

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
