import { PrimaryKey, Property } from '@mikro-orm/core'

/**
 * BaseEntity — abstract base for all MikroORM entities.
 *
 * @Entity() is NOT on this class — only on concrete entities (User, Role).
 * MikroORM v6 requires all entities to have @Entity() decorator.
 * This abstract class provides shared field definitions that concrete
 * entities inherit via TypeScript class inheritance.
 */
export abstract class BaseEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ type: 'Date' })
  createdAt!: Date

  @Property({ type: 'Date', onUpdate: () => new Date() })
  updatedAt!: Date

  @Property({ type: 'Date', nullable: true })
  deletedAt!: Date | null

  @Property({ type: 'number' })
  version!: number
}
