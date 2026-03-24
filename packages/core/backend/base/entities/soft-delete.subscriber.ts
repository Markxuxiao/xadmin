/**
 * Soft-delete implementation for MikroORM v6.
 *
 * HOW IT WORKS:
 * - Each entity adds @Filter({ name: 'soft-delete', cond: { deletedAt: null } })
 * - Queries use em.find(User, {}, { filter: ['soft-delete'] }) to exclude soft-deleted
 * - Delete operation: set entity.deletedAt = new Date(); await em.flush()
 * - NO physical deletion — ever
 *
 * Usage:
 *   @Filter({ name: 'soft-delete', cond: { deletedAt: null } })
 *   @Entity()
 *   export class User { ... }
 *
 * In services (Phase 2):
 *   async softDelete(id: string) {
 *     const user = await this.em.findOneOrFail(User, id)
 *     user.deletedAt = new Date()
 *     await this.em.flush()
 *   }
 */
export type SoftDeleteFilter = { deletedAt: null }
