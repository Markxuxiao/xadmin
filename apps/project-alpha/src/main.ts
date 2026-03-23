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
import UserList from '@xadmin/module-user/views/UserList.vue'

const routes = [
  { path: '/login', name: 'login', component: Login },
  {
    path: '/',
    component: Framework,
    redirect: '/dashboard',
    children: [
      { path: '/dashboard', name: 'dashboard', component: Dashboard },
      { path: '/system/user', name: 'system-user', component: UserList },
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

  if (to.path !== '/login' && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
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
