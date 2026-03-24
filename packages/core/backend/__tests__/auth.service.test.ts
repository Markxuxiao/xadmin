import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../core/auth/auth.service'
import { OnlineUserService } from '../core/online-user/online-user.service'

// Token/JWT tests — no DB needed
describe('AuthService — token/JWT (no DB)', () => {
  let authService: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    // AuthService depends on OnlineUserService — mock it
    const mockOnlineUserService = {
      register: vi.fn(),
      refresh: vi.fn(),
      remove: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      cleanExpired: vi.fn(),
      count: vi.fn(),
    } as any
    authService = new AuthService(mockOnlineUserService)
  })

  describe('verifyToken', () => {
    it('should return null for invalid token format', () => {
      expect(authService.verifyToken('not-a-jwt')).toBeNull()
      expect(authService.verifyToken('')).toBeNull()
      expect(authService.verifyToken('a.b')).toBeNull()
    })

    it('should return null for tampered token', () => {
      const token = authService.generateToken({
        id: '1',
        username: 'admin',
        nickname: 'Admin',
        roles: '["admin"]',
        permissions: '["*"]',
      } as any)

      const [h, p] = token.token.split('.')
      const tampered = `${h}.${p}.wrong_signature`
      expect(authService.verifyToken(tampered)).toBeNull()
    })

    it('should return null for expired token', () => {
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        sub: '1',
        username: 'admin',
        nickname: 'Admin',
        permissions: ['*'],
        roles: ['admin'],
        iat: now - 3600,
        exp: now - 1800,
      }
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const sig = Buffer.from('test-signature').toString('base64url')
      const expiredToken = `${header}.${payloadB64}.${sig}`

      expect(authService.verifyToken(expiredToken)).toBeNull()
    })
  })

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = {
        id: '1',
        username: 'admin',
        password: 'hash',
        nickname: '管理员',
        avatar: null,
        roles: '["admin"]',
        permissions: '["user:list"]',
        enabled: 1,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        created_by: null,
        updated_by: null,
      }

      const { token, expiresAt } = authService.generateToken(user as any)

      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
      expect(expiresAt).toBeGreaterThan(Date.now())
      expect(expiresAt).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000 + 1000)
    })

    it('should include correct payload claims', () => {
      const user = {
        id: '99',
        username: 'testuser',
        password: 'hash',
        nickname: 'Test User',
        avatar: null,
        roles: '["editor"]',
        permissions: '["content:read","content:write"]',
        enabled: 1,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        created_by: null,
        updated_by: null,
      }

      const { token } = authService.generateToken(user as any)
      const payload = authService.verifyToken(token)

      expect(payload).not.toBeNull()
      expect(payload!.sub).toBe('99')
      expect(payload!.username).toBe('testuser')
      expect(payload!.nickname).toBe('Test User')
      expect(payload!.roles).toEqual(['editor'])
      expect(payload!.permissions).toEqual(['content:read', 'content:write'])
    })
  })

  describe('getCurrentUser', () => {
    it('should return null for invalid token', () => {
      expect(authService.getCurrentUser('invalid')).toBeNull()
    })

    it('should extract user info from valid token', () => {
      const user = {
        id: '1',
        username: 'admin',
        password: 'hash',
        nickname: 'Administrator',
        avatar: null,
        roles: '["admin"]',
        permissions: '["user:list", "user:create"]',
        enabled: 1,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        created_by: null,
        updated_by: null,
      }

      const { token } = authService.generateToken(user as any)
      const currentUser = authService.getCurrentUser(token)

      expect(currentUser).not.toBeNull()
      expect(currentUser!.id).toBe('1')
      expect(currentUser!.username).toBe('admin')
      expect(currentUser!.nickname).toBe('Administrator')
      expect(currentUser!.roles).toEqual(['admin'])
      expect(currentUser!.permissions).toEqual(['user:list', 'user:create'])
    })
  })
})
