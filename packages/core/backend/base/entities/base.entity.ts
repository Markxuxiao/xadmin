import { PrimaryKey, Property } from '@mikro-orm/core'

/**
 * BaseEntity — abstract base for all MikroORM entities.
 *
 * IMPORTANT: MikroORM v6 does NOT inherit @Property decorators from parent classes.
 * Each concrete entity must define its own @Property decorators with @Entity().
 * This abstract class provides:
 *   1. TypeScript type inheritance (fields are type-checked on child classes)
 *   2. Default @Property decorator values for documentation/reference
 *
 * Child entities that extend BaseEntity should NOT remove their local property
 * definitions - MikroORM will not pick up the inherited @Property decorators.
 * The child entity's local @Property decorator takes precedence.
 *
 * Standard fieldName mappings used by concrete entities:
 *   - createdAt -> created_at
 *   - updatedAt -> updated_at
 *   - deletedAt -> deleted_at
 *   - version    -> version
 */
export abstract class BaseEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  /**
   * Creation timestamp.
   * @Property type: 'Date', fieldName: 'created_at'
   */
  @Property({ type: 'Date', fieldName: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  /**
   * Last update timestamp - auto-set on every update.
   * @Property type: 'Date', fieldName: 'updated_at'
   */
  @Property({ type: 'Date', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date

  /**
   * Soft-delete timestamp (null = not deleted).
   * @Property type: 'Date', fieldName: 'deleted_at', nullable: true
   */
  @Property({ type: 'Date', fieldName: 'deleted_at', nullable: true })
  deletedAt!: Date | null

  /**
   * Optimistic locking version.
   * @Property type: 'number', fieldName: 'version', default: 1
   */
  @Property({ type: 'number', fieldName: 'version', default: 1 })
  version!: number
}
