// 用户状态管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { UserInfo, LoginResult, TokenInfo } from '../types'
import { isTokenExpired } from '../types'
import { login as loginApi } from '../api/auth'
import { getCurrentUser } from '../api/user'
export type { UserInfo, LoginResult } from '../types'

const STORAGE_KEY_TOKEN = 'xadmin_token'

function getStoredToken(): TokenInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOKEN)
    if (!raw) return null
    return JSON.parse(raw) as TokenInfo
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

  // 登录 — 调用后端 POST /api/auth/login
  async function login(username: string, password: string): Promise<LoginResult> {
    try {
      const res = await loginApi({ username, password })
      if (res.success) {
        const { token: accessToken, expiresAt, user: userData } = res.data
        const newToken: TokenInfo = { accessToken, expiresAt }
        tokenInfo.value = newToken
        userInfo.value = userData
        setStoredToken(newToken)
        return { success: true }
      }
      return { success: false, message: res.message ?? '登录失败' }
    } catch (e: any) {
      console.error('[XAdmin] Login error:', e)
      const message = e?.response?.data?.message ?? e?.message ?? '登录失败，请稍后重试'
      return { success: false, message }
    }
  }

  function logout(): void {
    tokenInfo.value = null
    userInfo.value = null
    removeStoredToken()
  }

  // 获取用户信息 — 调用后端 GET /api/user/me
  async function fetchUserInfo(): Promise<UserInfo | null> {
    if (!tokenInfo.value) return null
    if (isTokenExpired(tokenInfo.value)) {
      logout()
      return null
    }
    try {
      const res = await getCurrentUser()
      if (res.success) {
        userInfo.value = res.data
        return res.data
      }
      return null
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
