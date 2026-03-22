// 菜单状态管理
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MenuItem } from '../types'
import { getMenuTree } from '../api/menu'
export type { MenuItem } from '../types'

export const useMenuStore = defineStore('xadmin-menu', () => {
  const menus = ref<MenuItem[]>([])
  const collapsed = ref(false)

  // 从后端获取菜单数据 — 调用 GET /api/menu/tree
  async function fetchMenus() {
    try {
      const res = await getMenuTree()
      if (res.success) {
        menus.value = res.data
      }
    } catch (e) {
      console.error('[XAdmin] fetchMenus error:', e)
    }
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
