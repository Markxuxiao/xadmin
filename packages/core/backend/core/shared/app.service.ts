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
export class AppService {
  /**
   * Get full menu tree (no filtering) - used for admin or when no roles provided.
   */
  getMenuTree(): MenuItem[] {
    return DEFAULT_MENU_TREE
  }

  /**
   * Get menu tree filtered by user roles.
   * If user has admin role ('*' permission) or no roles, returns full menu.
   */
  async getMenuTreeByRoles(roleIds: string[]): Promise<MenuItem[]> {
    if (!roleIds || roleIds.length === 0) {
      return []
    }

    const em = getOrm().em.fork()

    // Check if user is admin
    const roles = await em.find(Role, { id: roleIds as any }, { filter: ['soft-delete'] })
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

    // Get user's action permissions from role.permissions (e.g., 'user:list', 'role:list')
    const userPermissions = new Set<string>()
    for (const role of roles) {
      try {
        const perms = JSON.parse(role.permissions)
        perms.forEach((p: string) => userPermissions.add(p))
      } catch {
        // ignore
      }
    }

    // Filter menu tree based on permissions
    return this.filterMenuByPermissions(DEFAULT_MENU_TREE, userPermissions)
  }

  /**
   * Filter menu tree by checking if the required permission is in user's permissions.
   */
  private filterMenuByPermissions(menus: MenuItem[], userPermissions: Set<string>): MenuItem[] {
    const result: MenuItem[] = []

    for (const menu of menus) {
      const requiredPermission = menu.meta?.permission

      // If no permission required, include the menu
      // If user has the required permission, include the menu
      if (!requiredPermission || userPermissions.has(requiredPermission)) {
        // Check if menu has children that need filtering
        if (menu.children && menu.children.length > 0) {
          const filteredChildren = this.filterMenuByPermissions(menu.children, userPermissions)
          // Include parent if it has no permission requirement OR if it has visible children
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
