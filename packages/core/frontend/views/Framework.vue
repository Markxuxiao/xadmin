<template>
  <div class="framework">
    <!-- 侧边栏 -->
    <aside
      class="sidebar"
      :class="{ 'sidebar--collapsed': menuStore.collapsed }"
    >
      <div class="sidebar__logo">
        <span class="logo-text">{{ menuStore.collapsed ? 'X' : 'XAdmin' }}</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="menuStore.collapsed"
        :collapse-transition="false"
        class="sidebar-menu"
        @select="handleMenuSelect"
      >
        <template v-for="item in menuStore.menus" :key="item.path">
          <el-sub-menu v-if="item.children" :index="item.path">
            <template #title>
              <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.path"
              :index="child.path"
            >
              {{ child.title }}
            </el-menu-item>
          </el-sub-menu>

          <el-menu-item v-else :index="item.path">
            <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </aside>

    <!-- 主体区 -->
    <div class="main">
      <!-- 头部 -->
      <header class="header">
        <div class="header__left">
          <el-icon class="collapse-btn" @click="menuStore.toggleCollapsed">
            <Fold v-if="!menuStore.collapsed" />
            <Expand v-else />
          </el-icon>
        </div>

        <div class="header__right">
          <el-icon class="header-icon" title="通知">
            <Bell />
          </el-icon>

          <el-dropdown @command="handleUserCommand">
            <div class="user-avatar">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username">{{ userStore.userInfo?.nickname }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="settings">设置</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-icon class="header-icon" title="深色模式">
            <Sunny v-if="isDark" @click="toggleDark" />
            <Moon v-else @click="toggleDark" />
          </el-icon>
        </div>
      </header>

      <!-- 标签页 -->
      <div class="tabs">
        <el-tabs
          v-model="routerStore.activeTab"
          type="card"
          @tab-click="handleTabClick"
          @edit="handleTabEdit"
        >
          <el-tab-pane
            v-for="tab in routerStore.tabs"
            :key="tab.path"
            :label="tab.title"
            :name="tab.path"
            :closable="tab.closable !== false"
            @contextmenu="handleTabContextMenu($event, tab)"
          />
        </el-tabs>

        <!-- Tab Context Menu -->
        <el-dropdown
          ref="tabContextMenuRef"
          trigger="manual"
          placement="bottom-start"
          :visible="contextMenuVisible"
          @command="handleContextMenuCommand"
        >
          <div
            v-show="false"
            style="position: fixed; left: -9999px;"
          />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="closeCurrent">关闭当前</el-dropdown-item>
              <el-dropdown-item command="closeOther">关闭其他</el-dropdown-item>
              <el-dropdown-item command="closeAll">关闭所有</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- 内容区 -->
      <main class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Mobile Drawer — only in DOM on mobile -->
    <el-drawer
      v-if="isMobile"
      v-model="mobileDrawerVisible"
      direction="ltr"
      :show-close="false"
      size="220px"
    >
      <div class="drawer-logo">XAdmin</div>
      <el-menu
        :default-active="activeMenu"
        class="drawer-menu"
        @select="handleMenuSelect"
      >
        <template v-for="item in menuStore.menus" :key="item.path">
          <el-sub-menu v-if="item.children" :index="item.path">
            <template #title>{{ item.title }}</template>
            <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
              {{ child.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">{{ item.title }}</el-menu-item>
        </template>
      </el-menu>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Fold, Expand, Bell, Sunny, Moon } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '../runtime/stores/user'
import { useMenuStore } from '../runtime/stores/menu'
import { useRouterStore } from '../runtime/stores/router'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const menuStore = useMenuStore()
const routerStore = useRouterStore()

const isDark = ref(false)
const mobileDrawerVisible = ref(false)
const contextMenuVisible = ref(false)
const contextMenuTarget = ref<string | null>(null)
const tabContextMenuRef = ref()

// Mobile detection — only show drawer on screens < 768px
const isMobile = ref(window.matchMedia('(max-width: 767px)').matches)
onMounted(() => {
  const mq = window.matchMedia('(max-width: 767px)')
  mq.addEventListener('change', (e) => { isMobile.value = e.matches })
})

const activeMenu = computed(() => route.path)

// O(1) menu path lookup — built once, not searched on every navigation
const menuPathMap = computed(() => {
  const map = new Map<string, string>()
  for (const item of menuStore.menus) {
    map.set(item.path, item.title)
    if (item.children) {
      for (const child of item.children) {
        map.set(child.path, child.title)
      }
    }
  }
  return map
})

onMounted(() => {
  menuStore.initCollapsedState()
  menuStore.fetchMenus()
})

function handleMenuSelect(path: string) {
  mobileDrawerVisible.value = false
  router.push(path)
  routerStore.addTab({ path, title: getMenuTitle(path), closable: path !== '/dashboard' })
}

function handleTabClick(tab: any) {
  router.push(tab.props.name)
}

function handleTabEdit(targetPath: string, action: 'remove' | 'add') {
  if (action === 'remove') {
    routerStore.removeTab(targetPath)
  }
}

function getMenuTitle(path: string): string {
  return menuPathMap.value.get(path) ?? path
}

function handleUserCommand(command: string) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定退出登录？', '提示').then(() => {
      userStore.logout()
      router.push('/login')
    }).catch(() => {})
  }
}

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

function handleTabContextMenu(event: MouseEvent, tab: { path: string; closable?: boolean }) {
  if (tab.closable === false) return // Can't close home tab
  event.preventDefault()
  contextMenuTarget.value = tab.path
  contextMenuVisible.value = true
  // Position the dropdown at cursor
  const menu = document.querySelector('.tabs .el-dropdown') as HTMLElement
  if (menu) {
    menu.style.left = `${event.clientX}px`
    menu.style.top = `${event.clientY}px`
    menu.style.position = 'fixed'
  }
  // Close on click outside
  const closeMenu = () => {
    contextMenuVisible.value = false
    document.removeEventListener('click', closeMenu)
  }
  setTimeout(() => document.addEventListener('click', closeMenu), 0)
}

function handleContextMenuCommand(command: string) {
  const target = contextMenuTarget.value
  contextMenuVisible.value = false
  if (!target) return

  switch (command) {
    case 'closeCurrent':
      routerStore.removeTab(target)
      break
    case 'closeOther':
      routerStore.closeOtherTabs(target)
      break
    case 'closeAll':
      routerStore.closeAllTabs()
      break
  }
}
</script>

<style scoped>
.framework {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 220px;
  height: 100vh;
  background: #fff;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.sidebar--collapsed {
  width: 64px;
}

.sidebar__logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #e6e6e6;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

/* 主体区 */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #e6e6e6;
  background: #fff;
  flex-shrink: 0;
}

.header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.header__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.user-avatar:hover {
  background: #f5f7fa;
}

.username {
  font-size: 14px;
  color: #303133;
}

/* 标签页 */
.tabs {
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  flex-shrink: 0;
}

:deep(.el-tabs__header) {
  margin: 0;
}

:deep(.el-tabs__nav) {
  border: none;
}

/* 内容区 */
.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f5f7fa;
}

/* 路由过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 200ms, transform 200ms;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
}

/* Mobile Drawer */
.drawer-logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  border-bottom: 1px solid #e6e6e6;
}

/* 响应式 */
@media (max-width: 767px) {
  .sidebar {
    display: none;
  }

  .mobile-drawer {
    display: block;
  }

  .username {
    display: none;
  }
}
</style>
