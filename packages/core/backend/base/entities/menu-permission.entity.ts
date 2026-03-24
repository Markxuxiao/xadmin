import { Entity, Filter, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core'
import { Role } from './role.entity'

// ============================================================================
// Backward-compatible types (used by existing services until Phase 2)
// ============================================================================

export interface MenuPermissionRow {
  id: string
  role_id: string
  menu_path: string
  action: string
  created_at: string
  updated_at: string
}

export function rowToMenuPermission(row: MenuPermissionRow) {
  return {
    id: row.id,
    roleId: row.role_id,
    menuPath: row.menu_path,
    action: row.action,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// MikroORM Entity
// Note: esbuild does not support emitDecoratorMetadata, so all property types
// must be specified explicitly in the decorator options.
// ============================================================================

/**
 * Soft-delete filter — auto-excludes soft-deleted menu permissions from all queries.
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class MenuPermission {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @ManyToOne({ entity: () => Role, fieldName: 'role_id' })
  role!: Role

  @Property({ type: 'string', fieldName: 'menu_path' })
  menuPath!: string

  @Property({ type: 'string' })
  action!: string

  @Property({ type: 'Date', fieldName: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ type: 'Date', fieldName: 'updated_at', defaultRaw: 'NOW()', onUpdate: () => 'NOW()' })
  updatedAt!: Date

  @Property({ type: 'Date', fieldName: 'deleted_at', nullable: true })
  deletedAt!: Date | null
}
