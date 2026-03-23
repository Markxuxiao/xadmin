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
  @PrimaryKey()
  id!: string

  @Property()
  createdAt!: Date

  @Property({ onUpdate: () => new Date() })
  updatedAt!: Date

  @Property({ nullable: true })
  deletedAt!: Date | null

  @Property()
  version!: number
}
