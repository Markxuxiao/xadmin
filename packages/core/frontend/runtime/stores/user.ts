// 用户状态管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar?: string
  permissions: string[]
  roles: string[]
}

export const useUserStore = defineStore('xadmin-user', () => {
  const token = ref<string | null>(localStorage.getItem('xadmin_token'))
  const userInfo = ref<UserInfo | null>(null)

  const isLoggedIn = computed(() => !!token.value)

  // Mock 登录
  async function login(username: string, password: string) {
    // TODO: 调用后端 API
    // 暂时用 mock 数据
    if (username === 'admin' && password === 'admin') {
      const mockUser: UserInfo = {
        id: '1',
        username: 'admin',
        nickname: '管理员',
        permissions: ['user:list', 'user:create', 'user:edit', 'user:delete'],
        roles: ['admin']
      }
      token.value = 'mock-jwt-token'
      userInfo.value = mockUser
      localStorage.setItem('xadmin_token', token.value!)
      return { success: true }
    }
    return { success: false, message: '用户名或密码错误' }
  }

  function logout() {
    token.value = null
    userInfo.value = null
    localStorage.removeItem('xadmin_token')
  }

  // 模拟获取用户信息
  async function fetchUserInfo() {
    if (!token.value) return null
    // TODO: 调用后端 /auth/me
    userInfo.value = {
      id: '1',
      username: 'admin',
      nickname: '管理员',
      permissions: ['user:list', 'user:create', 'user:edit', 'user:delete'],
      roles: ['admin']
    }
    return userInfo.value
  }

  function hasPermission(permission: string): boolean {
    return userInfo.value?.permissions.includes(permission) ?? false
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    logout,
    fetchUserInfo,
    hasPermission
  }
})
