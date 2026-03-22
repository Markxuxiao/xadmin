// 用户状态管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { UserInfo, LoginResult, TokenInfo } from '../types'
import { isTokenExpired } from '../types'
export type { UserInfo, LoginResult } from '../types'

const STORAGE_KEY_TOKEN = 'xadmin_token'

// Mock token expiry: 15 minutes from login (matches design doc for real JWT)
const MOCK_TOKEN_TTL_MS = 15 * 60 * 1000

function getStoredToken(): TokenInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOKEN)
    if (!raw) return null
    // For Phase 1: stored as JSON { accessToken, expiresAt }
    // For compatibility, also accept raw string (old mock format)
    try {
      return JSON.parse(raw) as TokenInfo
    } catch {
      // Legacy: raw string token — create mock TokenInfo
      return {
        accessToken: raw,
        expiresAt: Date.now() + MOCK_TOKEN_TTL_MS
      }
    }
  } catch {
    console.warn('[XAdmin] Failed to read token from localStorage')
    return null
  }
}

function setStoredToken(tokenInfo: TokenInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(tokenInfo))
  } catch (e) {
    console.error('[XAdmin] Failed to store token:', e)
  }
}

function removeStoredToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN)
  } catch (e) {
    console.error('[XAdmin] Failed to remove token:', e)
  }
}

export const useUserStore = defineStore('xadmin-user', () => {
  const tokenInfo = ref<TokenInfo | null>(getStoredToken())
  const userInfo = ref<UserInfo | null>(null)

  // isLoggedIn: token exists AND is not expired
  const isLoggedIn = computed(() => !!tokenInfo.value && !isTokenExpired(tokenInfo.value))

  // Access token for API calls
  const token = computed(() => tokenInfo.value?.accessToken ?? null)

  // Mock 登录
  async function login(username: string, password: string): Promise<LoginResult> {
    // TODO: 调用后端 API
    // 暂时用 mock 数据
    try {
      if (username === 'admin' && password === 'admin') {
        const mockUser: UserInfo = {
          id: '1',
          username: 'admin',
          nickname: '管理员',
          permissions: ['user:list', 'user:create', 'user:edit', 'user:delete'],
          roles: ['admin']
        }
        const newToken: TokenInfo = {
          accessToken: 'mock-jwt-token',
          expiresAt: Date.now() + MOCK_TOKEN_TTL_MS,
          refreshToken: 'mock-refresh-token'
        }
        tokenInfo.value = newToken
        userInfo.value = mockUser
        setStoredToken(newToken)
        return { success: true }
      }
      return { success: false, message: '用户名或密码错误' }
    } catch (e) {
      console.error('[XAdmin] Login error:', e)
      return { success: false, message: '登录失败，请稍后重试' }
    }
  }

  function logout(): void {
    tokenInfo.value = null
    userInfo.value = null
    removeStoredToken()
  }

  // 模拟获取用户信息
  async function fetchUserInfo(): Promise<UserInfo | null> {
    if (!tokenInfo.value) return null
    if (isTokenExpired(tokenInfo.value)) {
      // Token expired — clear and redirect to login
      logout()
      return null
    }
    try {
      // TODO: 调用后端 /auth/me
      userInfo.value = {
        id: '1',
        username: 'admin',
        nickname: '管理员',
        permissions: ['user:list', 'user:create', 'user:edit', 'user:delete'],
        roles: ['admin']
      }
      return userInfo.value
    } catch (e) {
      console.error('[XAdmin] fetchUserInfo error:', e)
      return null
    }
  }

  function hasPermission(permission: string): boolean {
    return userInfo.value?.permissions.includes(permission) ?? false
  }

  return {
    tokenInfo,
    token,
    userInfo,
    isLoggedIn,
    login,
    logout,
    fetchUserInfo,
    hasPermission
  }
})
