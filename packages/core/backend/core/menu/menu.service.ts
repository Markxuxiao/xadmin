import { Injectable } from '@nestjs/common'
import { getOrm, Role } from '../../base'

export interface MenuItem {
  path: string
  title: string
  icon?: string
  children?: MenuItem[]
  meta?: { permission?: string }
}

export interface FullMenuItem extends MenuItem {
  /** Internal path used for menu permission matching */
  _fullPath?: string
}

const DEFAULT_MENU_TREE: MenuItem[] = [
  {
    path: '/dashboard',
    title: '首页',
    icon: 'HomeFilled',
  },
  {
    path: '/system',
    title: '系统管理',
    icon: 'Setting',
    children: [
      { path: '/system/user', title: '用户管理', icon: 'User', meta: { permission: 'user:list' } },
      { path: '/system/role', title: '角色管理', icon: 'UserFilled', meta: { permission: 'role:list' } },
      { path: '/system/department', title: '部门管理', icon: 'OfficeBuilding', meta: { permission: 'department:list' } },
      { path: '/system/dict', title: '字典管理', icon: 'Grid', meta: { permission: 'dict:list' } },
      { path: '/system/audit-log', title: '操作日志', icon: 'Document', meta: { permission: 'audit-log:list' } },
      { path: '/system/file', title: '文件管理', icon: 'Folder', meta: { permission: 'file:list' } },
    ],
  },
  {
    path: '/order',
    title: '订单管理',
    icon: 'Document',
    children: [
      { path: '/order/list', title: '订单列表', meta: { permission: 'order:list' } },
    ],
  },
]

@Injectable()
export class MenuService {
  getMenuTree(): MenuItem[] {
    return DEFAULT_MENU_TREE
  }

  async getMenuTreeByRoles(roleIds: string[]): Promise<MenuItem[]> {
    if (!roleIds || roleIds.length === 0) {
      return []
    }

    const em = getOrm().em.fork()

    const roles = await em.find(Role, { id: roleIds as any }, { filters: ['soft-delete'] })
    const isAdmin = roles.some(r => {
      try {
        const perms = JSON.parse(r.permissions)
        return perms.includes('*')
      } catch {
        return false
      }
    })

    if (isAdmin) {
      return DEFAULT_MENU_TREE
    }

    const userPermissions = new Set<string>()
    for (const role of roles) {
      try {
        const perms = JSON.parse(role.permissions)
        perms.forEach((p: string) => userPermissions.add(p))
      } catch {
        // ignore
      }
    }

    return this.filterMenuByPermissions(DEFAULT_MENU_TREE, userPermissions)
  }

  private filterMenuByPermissions(menus: MenuItem[], userPermissions: Set<string>): MenuItem[] {
    const result: MenuItem[] = []

    for (const menu of menus) {
      const requiredPermission = menu.meta?.permission

      if (!requiredPermission || userPermissions.has(requiredPermission)) {
        if (menu.children && menu.children.length > 0) {
          const filteredChildren = this.filterMenuByPermissions(menu.children, userPermissions)
          if (!requiredPermission || filteredChildren.length > 0) {
            result.push({
              ...menu,
              children: filteredChildren,
            })
          }
        } else {
          result.push({ ...menu })
        }
      }
    }

    return result
  }
}
