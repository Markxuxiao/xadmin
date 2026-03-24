import { Injectable } from '@nestjs/common'
import { getOrm } from '../../base/database'
import { Menu } from '../../base/entities/menu.entity'
import { MenuPermission } from '../../base/entities/menu-permission.entity'
import { Role } from '../../base/entities/role.entity'

@Injectable()
export class MenuService {
  // 获取完整菜单树
  async getMenuTree(): Promise<any[]> {
    const em = getOrm().em.fork()
    const allMenus = await em.find(Menu, {}, { orderBy: { sort: 'ASC' } })
    return this.buildTree(allMenus)
  }

  // 获取用户的菜单树（按角色过滤）
  async getMenuTreeByRoles(roleIds: string[]): Promise<any[]> {
    const em = getOrm().em.fork()

    // 空角色数组返回空
    if (!roleIds || roleIds.length === 0) {
      return []
    }

    // 如果有 admin 角色，返回全部菜单
    const roles = await em.find(Role, { id: roleIds as any, deletedAt: null })
    const isAdmin = roles.some(r => r.code === 'admin')
    if (isAdmin) {
      return this.getMenuTree()
    }

    // 收集所有角色的权限
    const rolePermissionsSet = new Set<string>()
    for (const role of roles) {
      try {
        const perms = JSON.parse(role.permissions)
        perms.forEach((p: string) => rolePermissionsSet.add(p))
      } catch {
        // ignore malformed JSON
      }
    }

    // 从 MenuPermission 表查询角色有权限的菜单
    const permissions = await em.find(MenuPermission, {
      role: { id: { $in: roleIds } },
      deletedAt: null
    })

    const permittedPaths = [...new Set(permissions.map(p => p.menuPath))]

    const allMenus = await em.find(Menu, { enabled: true, deletedAt: null }, { orderBy: { sort: 'ASC' } })
    // 过滤：有权限的菜单 + 无需权限的菜单（permission 为空）+ 其所有祖先菜单
    const allowedMenus = allMenus.filter(m =>
      // 无需权限的菜单总是包含
      !m.permission ||
      // 角色有所需权限
      rolePermissionsSet.has(m.permission) ||
      // 菜单路径在 MenuPermission 中
      permittedPaths.some(p => m.path === p || m.path.startsWith(p + '/'))
    )

    // 添加祖先节点（确保树结构完整）
    const allAllowedPaths = new Set<string>()
    allowedMenus.forEach(m => {
      allAllowedPaths.add(m.path)
      // 添加所有祖先路径
      let current = m
      while (current.parentId) {
        const parent = allMenus.find(x => x.id === current.parentId)
        if (parent) {
          allAllowedPaths.add(parent.path)
          current = parent
        } else {
          break
        }
      }
    })

    const fullMenus = allMenus.filter(m => allAllowedPaths.has(m.path))
    return this.buildTree(fullMenus, allMenus)
  }

  // 获取单个菜单
  async findById(id: string): Promise<Menu | null> {
    const em = getOrm().em.fork()
    return em.findOne(Menu, { id, deletedAt: null })
  }

  // 获取所有菜单（扁平）
  async findAll(): Promise<Menu[]> {
    const em = getOrm().em.fork()
    return em.find(Menu, { deletedAt: null }, { orderBy: { sort: 'ASC' } })
  }

  // 创建菜单
  async create(data: {
    path: string
    title: string
    icon?: string
    parentId?: string | null
    sort?: number
    permission?: string
    enabled?: boolean
  }): Promise<Menu> {
    const em = getOrm().em.fork()

    if (data.parentId) {
      const parent = await em.findOne(Menu, { id: data.parentId, deletedAt: null })
      if (!parent) throw new Error('Parent menu not found')
    }

    const menu = em.create(Menu, {
      id: crypto.randomUUID(),
      path: data.path,
      title: data.title,
      icon: data.icon || null,
      parentId: data.parentId || null,
      sort: data.sort ?? 0,
      permission: data.permission || null,
      enabled: data.enabled ?? true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })

    await em.persistAndFlush(menu)
    return menu
  }

  // 更新菜单
  async update(id: string, data: Partial<{
    path: string
    title: string
    icon: string
    parentId: string | null
    sort: number
    permission: string
    enabled: boolean
  }>): Promise<Menu> {
    const em = getOrm().em.fork()
    const menu = await em.findOneOrFail(Menu, { id, deletedAt: null })

    // 防止循环引用
    if (data.parentId === id) {
      throw new Error('Cannot set menu as its own parent')
    }

    em.assign(menu, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)))
    await em.flush()
    return menu
  }

  // 删除菜单（软删除）
  async delete(id: string): Promise<void> {
    const em = getOrm().em.fork()
    const menu = await em.findOne(Menu, { id, deletedAt: null })
    if (!menu) return

    // 检查是否有子菜单
    const children = await em.find(Menu, { parentId: id, deletedAt: null })
    if (children.length > 0) {
      throw new Error('Cannot delete menu with children')
    }

    menu.deletedAt = new Date()
    await em.flush()
  }

  // 构建树形结构
  private buildTree(menus: Menu[], allMenus?: Menu[]): any[] {
    const map = new Map<string, Menu>()
    const roots: any[] = []

    menus.forEach(m => map.set(m.id, m))

    // Find all parentIds in menus (to know which menus have children in the result)
    const parentIdsInResult = new Set<string>()
    menus.forEach(m => {
      if (m.parentId) parentIdsInResult.add(m.parentId)
    })

    menus.forEach(m => {
      if (m.parentId && map.has(m.parentId)) {
        // 有父菜单，作为子节点
        const parent = map.get(m.parentId)!
        const parentAny = parent as any
        parentAny.children = parentAny.children || []
        parentAny.children.push(m)
      } else {
        // 顶级菜单：检查是否在原始数据中有子菜单（即使被过滤了）
        if (allMenus) {
          const hasChildren = allMenus.some(x => x.parentId === m.id)
          if (hasChildren) {
            (m as any).children = (m as any).children || []
          }
        }
        roots.push(m)
      }
    })

    return roots
  }
}
