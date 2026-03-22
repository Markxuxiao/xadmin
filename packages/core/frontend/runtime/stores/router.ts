// 动态路由状态管理
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MenuItem } from './menu'
import type { RouteRecordRaw } from 'vue-router'

// 注入的 viewsMap（来自 plugin.ts）
declare global {
  interface XAdminContext {
    viewsMap?: Record<string, () => Promise<any>>
  }
}

export interface TabItem {
  path: string
  title: string
  closable?: boolean
}

export const useRouterStore = defineStore('xadmin-router', () => {
  const tabs = ref<TabItem[]>([
    { path: '/dashboard', title: '首页', closable: false }
  ])

  const activeTab = ref('/dashboard')

  // 从后端菜单生成路由
  function generateRoutes(menus: MenuItem[], viewsMap: Record<string, () => Promise<any>>): RouteRecordRaw[] {
    const routes: RouteRecordRaw[] = []

    function traverse(items: MenuItem[]) {
      for (const item of items) {
        const route: RouteRecordRaw = {
          path: item.path,
          name: item.path.replace(/\//g, '_').replace(/^_/, ''),
          meta: {
            title: item.title,
            icon: item.icon,
            permission: item.meta?.permission
          }
        }

        // 尝试从 glob map 中匹配组件
        const componentPath = `/packages${item.path}.vue`
        if (viewsMap[componentPath]) {
          route.component = () => viewsMap[componentPath]()
        } else if (item.children) {
          // 有子菜单的父路由使用默认空白组件
          route.component = () => Promise.resolve({ template: '<div></div>' })
          traverse(item.children)
        }

        routes.push(route)
      }
    }

    traverse(menus)
    return routes
  }

  function addTab(tab: TabItem) {
    const exists = tabs.value.find(t => t.path === tab.path)
    if (!exists) {
      tabs.value.push(tab)
    }
    activeTab.value = tab.path
  }

  function removeTab(path: string) {
    const index = tabs.value.findIndex(t => t.path === path)
    if (index === -1) return

    // 首页不可关闭
    if (!tabs.value[index].closable) return

    tabs.value.splice(index, 1)

    // 如果关闭的是当前激活的 tab，跳转到相邻的
    if (activeTab.value === path) {
      const next = tabs.value[index] || tabs.value[index - 1]
      activeTab.value = next?.path || '/dashboard'
    }
  }

  function closeOtherTabs(currentPath: string) {
    tabs.value = tabs.value.filter(t => !t.closable || t.path === currentPath)
  }

  function closeAllTabs() {
    tabs.value = tabs.value.filter(t => !t.closable)
    activeTab.value = '/dashboard'
  }

  return {
    tabs,
    activeTab,
    generateRoutes,
    addTab,
    removeTab,
    closeOtherTabs,
    closeAllTabs
  }
})
