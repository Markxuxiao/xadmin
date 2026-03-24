import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { getOrm, MenuPermission, MenuPermissionRow, Role } from '../../base'

@Injectable()
export class MenuPermissionService {
  /**
   * Find all menu permissions for a given role ID.
   */
  async findByRoleId(roleId: string): Promise<MenuPermissionRow[]> {
    const em = getOrm().em.fork()
    const permissions = await em.find(MenuPermission, { role: roleId as any, deletedAt: null })
    return permissions.map(p => this.toRow(p))
  }

  /**
   * Find all menu permissions for multiple role IDs.
   */
  async findByRoleIds(roleIds: string[]): Promise<MenuPermissionRow[]> {
    if (roleIds.length === 0) return []
    const em = getOrm().em.fork()
    const permissions = await em.find(MenuPermission, { role: roleIds as any, deletedAt: null })
    return permissions.map(p => this.toRow(p))
  }

  /**
   * Check if a role has permission to access a specific menu path.
   * Returns true if the role has any permission for the path, or if admin role (*).
   */
  async hasMenuPermission(roleIds: string[], menuPath: string): Promise<boolean> {
    if (roleIds.length === 0) return false

    const em = getOrm().em.fork()

    // Check if user is admin (has '*' permission)
    const roles = await em.find(Role, { id: roleIds as any, deletedAt: null })
    const isAdmin = roles.some(r => {
      try {
        const perms = JSON.parse(r.permissions)
        return perms.includes('*')
      } catch {
        return false
      }
    })
    if (isAdmin) return true

    // Check menu-specific permissions
    const menuPerms = await em.find(MenuPermission, { role: roleIds as any, deletedAt: null })
    return menuPerms.some(p => p.menuPath === menuPath || menuPath.startsWith(p.menuPath + '/'))
  }

  /**
   * Get all permitted menu paths for given role IDs.
   */
  async getPermittedPaths(roleIds: string[]): Promise<string[]> {
    if (roleIds.length === 0) return []

    const em = getOrm().em.fork()

    // Admin has all paths
    const roles = await em.find(Role, { id: roleIds as any, deletedAt: null })
    const isAdmin = roles.some(r => {
      try {
        const perms = JSON.parse(r.permissions)
        return perms.includes('*')
      } catch {
        return false
      }
    })
    if (isAdmin) return [] // Empty means all paths

    const menuPerms = await em.find(MenuPermission, { role: roleIds as any, deletedAt: null })
    return [...new Set(menuPerms.map(p => p.menuPath))]
  }

  /**
   * Create a new menu permission.
   */
  async create(data: { roleId: string; menuPath: string; action: string }): Promise<MenuPermissionRow> {
    const em = getOrm().em.fork()
    const now = new Date()

    const permission = em.create(MenuPermission, {
      id: crypto.randomUUID(),
      role: data.roleId as any,
      menuPath: data.menuPath,
      action: data.action,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    await em.persistAndFlush(permission)
    return this.toRow(permission)
  }

  /**
   * Delete menu permissions by role ID and menu path.
   */
  async deleteByRoleAndPath(roleId: string, menuPath: string): Promise<{ success: boolean }> {
    const em = getOrm().em.fork()
    const perms = await em.find(MenuPermission, { role: roleId as any, menuPath, deletedAt: null })

    if (perms.length === 0) {
      return { success: false }
    }

    for (const perm of perms) {
      perm.deletedAt = new Date()
    }
    await em.flush()
    return { success: true }
  }

  /**
   * Delete all menu permissions for a role.
   */
  async deleteByRoleId(roleId: string): Promise<{ success: boolean }> {
    const em = getOrm().em.fork()
    const perms = await em.find(MenuPermission, { role: roleId as any, deletedAt: null })

    if (perms.length === 0) {
      return { success: false }
    }

    for (const perm of perms) {
      perm.deletedAt = new Date()
    }
    await em.flush()
    return { success: true }
  }

  private toRow(perm: MenuPermission): MenuPermissionRow {
    return {
      id: perm.id,
      roleId: perm.role?.id ?? '',
      menuPath: perm.menuPath,
      action: perm.action,
      createdAt: perm.createdAt instanceof Date ? perm.createdAt.toISOString() : String(perm.createdAt),
      updatedAt: perm.updatedAt instanceof Date ? perm.updatedAt.toISOString() : String(perm.updatedAt),
    }
  }
}
