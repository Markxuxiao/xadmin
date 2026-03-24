import { Injectable, BadRequestException } from '@nestjs/common'
import * as crypto from 'crypto'
import { getOrm, Role, MenuPermission, User } from '../../base'

@Injectable()
export class RoleService {
  /**
   * Find all roles with optional data scope filter.
   * @param dataScopeFilter - Optional MikroORM filter from DataPermissionGuard
   */
  async findAll(dataScopeFilter?: Record<string, any>) {
    const em = getOrm().em.fork()
    const filter = dataScopeFilter ? { ...dataScopeFilter } : {}
    const roles = await em.find(Role, { ...filter, deletedAt: null })
    return roles.map(r => this.roleToRow(r))
  }

  async findOne(id: string) {
    const em = getOrm().em.fork()
    const role = await em.findOne(Role, { id, deletedAt: null })
    return role ? this.roleToRow(role) : null
  }

  async findByCode(code: string) {
    const em = getOrm().em.fork()
    const role = await em.findOne(Role, { code, deletedAt: null })
    return role ? this.roleToRow(role) : null
  }

  async create(data: { name: string; code: string; description?: string; permissions?: string[] }) {
    const em = getOrm().em.fork()
    const now = new Date()
    const role = em.create(Role, {
      id: crypto.randomUUID(),
      name: data.name,
      code: data.code,
      description: data.description ?? null,
      permissions: JSON.stringify(data.permissions ?? []),
      enabled: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })
    await em.persistAndFlush(role)
    return this.roleToRow(role)
  }

  async update(id: string, data: Partial<{ name: string; code: string; description: string; permissions: string[]; enabled: boolean }>) {
    const em = getOrm().em.fork()
    const role = await em.findOne(Role, { id, deletedAt: null })
    if (!role) return null

    const assignData = Object.fromEntries(
      Object.entries({
        ...data,
        permissions: data.permissions !== undefined ? JSON.stringify(data.permissions) : undefined,
      }).filter(([, v]) => v !== undefined)
    )
    em.assign(role, assignData)

    await em.flush()
    return this.roleToRow(role)
  }

  async delete(id: string) {
    const em = getOrm().em.fork()

    // Check if role exists and is not deleted
    const role = await em.findOne(Role, { id, deletedAt: null })
    if (!role) return { success: false }

    // Prevent deletion of admin role
    if (role.code === 'admin') {
      throw new BadRequestException('Cannot delete admin role')
    }

    // Check if any users have this role assigned
    const usersWithRole = await em.count(User, {
      roles: { $like: `%"${id}"%` },
      deletedAt: null,
    })
    if (usersWithRole > 0) {
      throw new BadRequestException(`Cannot delete role: ${usersWithRole} users are assigned this role`)
    }

    // Cascade delete MenuPermission before deleting role
    await em.nativeDelete(MenuPermission, { role: { id } })

    role.deletedAt = new Date()
    await em.flush()
    return { success: true }
  }

  private roleToRow(role: Role) {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      permissions: JSON.parse(role.permissions),
      enabled: Boolean(role.enabled),
      createdAt: role.createdAt instanceof Date ? role.createdAt.toISOString() : String(role.createdAt),
      updatedAt: role.updatedAt instanceof Date ? role.updatedAt.toISOString() : String(role.updatedAt),
    }
  }
}
