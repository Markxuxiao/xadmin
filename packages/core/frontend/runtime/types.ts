// XAdmin 共享类型定义
export interface MenuItem {
  path: string
  title: string
  icon?: string
  children?: MenuItem[]
  meta?: { permission?: string }
}

export interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar?: string
  permissions: string[]
  roles: string[]
}

export interface TabItem {
  path: string
  title: string
  closable?: boolean
}

export interface LoginResult {
  success: boolean
  message?: string
}

// Token structure — compatible with JWT when backend is added
export interface TokenInfo {
  accessToken: string
  expiresAt: number // Unix timestamp (ms)
  refreshToken?: string
}

export function isTokenExpired(token: TokenInfo | null): boolean {
  if (!token) return true
  // Check if token is expired (with 30s buffer for clock skew)
  const expiresAt = token.expiresAt ?? 0
  return Date.now() >= expiresAt - 30000
}
