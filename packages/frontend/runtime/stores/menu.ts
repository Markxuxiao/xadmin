// 菜单状态管理
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MenuItem } from '../types'
export type { MenuItem } from '../types'

export const useMenuStore = defineStore('xadmin-menu', () => {
  const menus = ref<MenuItem[]>([])
  const collapsed = ref(false)

  // Mock 菜单数据
  async function fetchMenus() {
    // TODO: 调用后端 GET /menu/tree
    menus.value = [
      {
        path: '/dashboard',
        title: '首页',
        icon: 'HomeFilled'
      },
      {
        path: '/system',
        title: '系统管理',
        icon: 'Setting',
        children: [
          { path: '/system/user', title: '用户管理', icon: 'User', meta: { permission: 'user:list' } },
          { path: '/system/role', title: '角色管理', icon: 'UserFilled', meta: { permission: 'role:list' } }
        ]
      },
      {
        path: '/order',
        title: '订单管理',
        icon: 'Document',
        children: [
          { path: '/order/list', title: '订单列表', meta: { permission: 'order:list' } }
        ]
      }
    ]
  }

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
    localStorage.setItem('xadmin_sidebar_collapsed', String(collapsed.value))
  }

  function initCollapsedState() {
    const saved = localStorage.getItem('xadmin_sidebar_collapsed')
    if (saved !== null) {
      collapsed.value = saved === 'true'
    }
  }

  return {
    menus,
    collapsed,
    fetchMenus,
    toggleCollapsed,
    initCollapsedState
  }
})
