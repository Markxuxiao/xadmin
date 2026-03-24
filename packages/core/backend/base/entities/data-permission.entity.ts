import { Entity, Filter, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core'
import { Role } from './role.entity'

// ============================================================================
// Filter operators for data permission rules
// ============================================================================

export type FilterOperator =
  | 'eq'      // equals
  | 'neq'     // not equals
  | 'in'      // in array
  | 'nin'     // not in array
  | 'like'    // LIKE pattern
  | 'gt'      // greater than
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'isnull'  // is null
  | 'isnotnull' // is not null

// ============================================================================
// MikroORM Entity
// ============================================================================

/**
 * Data permission rule entity.
 * Defines row-level filtering rules based on user roles.
 *
 * Example:
 * - Role 'dept_manager' can only see users in their department (filter by departmentId)
 * - Role 'owner' can see all records in their organization
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class DataPermission {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  /** Role this permission applies to */
  @ManyToOne({ type: 'Role', fieldName: 'role_id' })
  role!: Role

  /** Resource type this permission applies to (e.g., 'user', 'department', 'order') */
  @Property({ type: 'string', fieldName: 'resource_type' })
  resourceType!: string

  /** Field name to filter on (e.g., 'departmentId', 'ownerId') */
  @Property({ type: 'string', fieldName: 'filter_field' })
  filterField!: string

  /** Filter operator */
  @Property({ type: 'string', fieldName: 'filter_operator' })
  filterOperator!: FilterOperator

  /** Filter value (JSON stringified for complex values like arrays) */
  @Property({ type: 'string', fieldName: 'filter_value' })
  filterValue!: string

  /** Permission priority (higher = evaluated first) */
  @Property({ type: 'number', default: 0 })
  priority!: number

  /** Whether this is an allow rule (true) or deny rule (false) */
  @Property({ type: 'boolean', default: true })
  allow!: boolean

  @Property({ type: 'Date', field: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ type: 'Date', field: 'updated_at', defaultRaw: 'NOW()', onUpdate: () => 'NOW()' })
  updatedAt!: Date

  @Property({ type: 'Date', field: 'deleted_at', nullable: true })
  deletedAt!: Date | null
}

// ============================================================================
// Backward-compatible types
// ============================================================================

export interface DataPermissionRow {
  id: string
  roleId: string
  resourceType: string
  filterField: string
  filterOperator: FilterOperator
  filterValue: string
  priority: number
  allow: boolean
  created_at: string
  updated_at: string
}

/**
 * Parsed filter value based on operator
 */
export interface ParsedFilterValue {
  field: string
  operator: FilterOperator
  value: any
}

/**
 * Data scope result containing parsed filter conditions for MikroORM
 */
export interface DataScopeResult {
  /** MikroORM filter conditions */
  filter: Record<string, any>
  /** Fields that user cannot access (for mask rendering) */
  excludedFields?: string[]
  /** Whether user has full access (no restrictions) */
  hasFullAccess: boolean
}

export function rowToDataPermission(row: DataPermissionRow) {
  return {
    id: row.id,
    roleId: row.roleId,
    resourceType: row.resourceType,
    filterField: row.filterField,
    filterOperator: row.filterOperator,
    filterValue: JSON.parse(row.filterValue),
    priority: row.priority,
    allow: Boolean(row.allow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
