import { Entity, Filter, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core'
import { BaseEntity } from './base.entity'
import { Role } from './role.entity'

// ============================================================================
// MikroORM Entity
// Note: esbuild does not support emitDecoratorMetadata, so all property types
// must be specified explicitly in the decorator options.
// ============================================================================

/**
 * Soft-delete filter — auto-excludes soft-deleted menus from all queries.
 * Usage in services:
 *   em.find(Menu, {}, { filter: ['soft-delete'] })
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class Menu extends BaseEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ type: 'string', fieldName: 'path' })
  path!: string

  @Property({ type: 'string', fieldName: 'title' })
  title!: string

  @Property({ type: 'string', fieldName: 'icon', nullable: true })
  icon?: string

  @Property({ type: 'string', fieldName: 'parent_id', nullable: true })
  parentId!: string | null

  @Property({ type: 'number', fieldName: 'sort', default: 0 })
  sort!: number

  @Property({ type: 'string', fieldName: 'permission', nullable: true })
  permission?: string

  @Property({ type: 'boolean', fieldName: 'enabled', default: true })
  enabled!: boolean

  @Property({ type: 'Date', fieldName: 'deleted_at', nullable: true })
  deletedAt!: Date | null
}
