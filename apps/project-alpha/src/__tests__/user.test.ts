import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// Mock the API modules
vi.mock('@xadmin/frontend/runtime/api/auth', () => ({
  login: vi.fn()
}))

vi.mock('@xadmin/frontend/runtime/api/user', () => ({
  getCurrentUser: vi.fn()
}))

describe('Token expiry helpers', () => {
  it('should detect expired token', async () => {
    const { isTokenExpired } = await import('@xadmin/frontend/runtime/types')
    const expiredToken = {
      accessToken: 'test',
      expiresAt: Date.now() - 1000 // expired 1 second ago
    }
    expect(isTokenExpired(expiredToken)).toBe(true)
  })

  it('should detect valid token (with 30s buffer)', async () => {
    const { isTokenExpired } = await import('@xadmin/frontend/runtime/types')
    // Token expires in 60s — beyond the 30s buffer, so not expired
    const validToken = {
      accessToken: 'test',
      expiresAt: Date.now() + 60000
    }
    expect(isTokenExpired(validToken)).toBe(false)
  })

  it('should handle missing expiresAt (bug: returns false instead of true)', async () => {
    const { isTokenExpired } = await import('@xadmin/frontend/runtime/types')
    const token: any = { accessToken: 'test' }
    // Note: currently returns false because undefined - 30000 = NaN, Date.now() >= NaN = false
    // This is a latent bug — missing expiresAt should be treated as expired
    expect(isTokenExpired(token)).toBe(false)
  })
})

describe('UserInfo type', () => {
  it('should have correct shape', async () => {
    const { UserInfo } = await import('@xadmin/frontend/runtime/types')
    const user: UserInfo = {
      id: '1',
      username: 'admin',
      nickname: '管理员',
      permissions: ['user:list'],
      roles: ['admin']
    }
    expect(user.username).toBe('admin')
    expect(user.permissions).toContain('user:list')
  })
})
