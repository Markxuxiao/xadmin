import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import { useUserStore } from '@xadmin/frontend/runtime/stores/user'
import { useRouterStore } from '@xadmin/frontend/runtime/stores/router'
import Login from '@xadmin/frontend/views/Login.vue'
import Framework from '@xadmin/frontend/views/Framework.vue'
import Dashboard from '@xadmin/frontend/views/Dashboard.vue'
import NotFound from '@xadmin/frontend/views/404.vue'
import Forbidden from '@xadmin/frontend/views/403.vue'
import Dict from '@xadmin/frontend/views/Dict.vue'
import AuditLog from '@xadmin/frontend/views/AuditLog.vue'
import File from '@xadmin/frontend/views/File.vue'
import Department from '@xadmin/frontend/views/Department.vue'
import UserList from '@xadmin/module-user/views/UserList.vue'
import RoleList from '@xadmin/module-user/views/RoleList.vue'

const routes = [
  { path: '/login', name: 'login', component: Login },
  {
    path: '/',
    component: Framework,
    redirect: '/dashboard',
    children: [
      { path: '/dashboard', name: 'dashboard', component: Dashboard },
      { path: '/system/user', name: 'system-user', component: UserList },
      { path: '/system/role', name: 'system-role', component: RoleList },
      { path: '/system/dict', name: 'system-dict', component: Dict },
      { path: '/system/audit-log', name: 'system-audit-log', component: AuditLog },
      { path: '/system/file', name: 'system-file', component: File },
      { path: '/system/department', name: 'system-department', component: Department },
      { path: '/:pathMatch(.*)*', name: '404', component: NotFound }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.path === '/login') {
    if (userStore.isLoggedIn) {
      next('/dashboard')
    } else {
      next()
    }
    return
  }

  if (!userStore.isLoggedIn) {
    next('/login')
    return
  }

  // 权限检查：如果路由有 meta.permission，检查用户是否有此权限
  if (to.meta?.permission) {
    const hasPermission = userStore.hasPermission(to.meta.permission)
    if (!hasPermission) {
      next('/403')
      return
    }
  }

  next()
})

const app = createApp(App)
const pinia = createPinia()

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app')
