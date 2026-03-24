import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../core/auth/auth.service'
import { OnlineUserService } from '../core/online-user/online-user.service'
import * as bcrypt from 'bcrypt'

// Use vi.hoisted to ensure mock functions are available when vi.mock runs
const mockGetOrm = vi.hoisted(() => vi.fn())

// Mock getOrm for DB-dependent tests
vi.mock('../base', () => ({
  getOrm: mockGetOrm,
  User: {}, // Mock User entity to prevent "No User export" error
}))

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

      const [h, p] = token.accessToken.split('.')
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

      const { accessToken: token, expiresAt } = authService.generateToken(user as any)

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

      const { accessToken: token } = authService.generateToken(user as any)
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

      const { accessToken: token } = authService.generateToken(user as any)
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

// DB-dependent tests (authenticate, refreshAccessToken, revokeRefreshToken, registerOnline)
describe('AuthService — authenticate', () => {
  let authService: AuthService
  let mockEm: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockEm = {
      fork: vi.fn().mockReturnThis(),
      findOne: vi.fn(),
    }

    mockGetOrm.mockReturnValue({ em: mockEm })

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

  it('should return user info for correct username and password', async () => {
    const hashedPassword = await bcrypt.hash('correct-password', 10)
    const mockUser = {
      id: '1',
      username: 'testuser',
      password: hashedPassword,
      nickname: 'Test User',
      avatar: null,
      roles: '["admin"]',
      permissions: '["user:list"]',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockEm.findOne.mockResolvedValue(mockUser)

    const result = await authService.authenticate('testuser', 'correct-password')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('1')
    expect(result!.username).toBe('testuser')
    expect(mockEm.findOne).toHaveBeenCalledWith(
      expect.anything(),
      { username: 'testuser', enabled: true },
    )
  })

  it('should return null for wrong password', async () => {
    const hashedPassword = await bcrypt.hash('correct-password', 10)
    const mockUser = {
      id: '1',
      username: 'testuser',
      password: hashedPassword,
      nickname: 'Test User',
      avatar: null,
      roles: '["admin"]',
      permissions: '["user:list"]',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockEm.findOne.mockResolvedValue(mockUser)

    const result = await authService.authenticate('testuser', 'wrong-password')

    expect(result).toBeNull()
  })

  it('should return null for non-existent user', async () => {
    mockEm.findOne.mockResolvedValue(null)

    const result = await authService.authenticate('nonexistent', 'any-password')

    expect(result).toBeNull()
  })

  it('should return null for disabled user', async () => {
    mockEm.findOne.mockResolvedValue(null) // enabled: true filter excludes disabled users

    const result = await authService.authenticate('disableduser', 'any-password')

    expect(result).toBeNull()
  })
})

describe('AuthService — refreshAccessToken', () => {
  let authService: AuthService
  let mockEm: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockEm = {
      fork: vi.fn().mockReturnThis(),
      findOne: vi.fn(),
    }

    mockGetOrm.mockReturnValue({ em: mockEm })

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

  it('should return new accessToken and refreshToken for valid refreshToken', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      password: 'hash',
      nickname: 'Test User',
      avatar: null,
      roles: '["admin"]',
      permissions: '["user:list"]',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockEm.findOne.mockResolvedValue(mockUser)

    // Generate a valid refresh token first
    const { refreshToken } = authService.generateToken(mockUser as any)

    const result = await authService.refreshAccessToken(refreshToken)

    expect(result).not.toBeNull()
    expect(result!.accessToken).toBeDefined()
    expect(result!.refreshToken).toBeDefined()
    expect(result!.accessToken.split('.').length).toBe(3)
    expect(result!.refreshToken).not.toBe(refreshToken) // Token should be rotated
  })

  it('should return null for invalid refreshToken', async () => {
    const result = await authService.refreshAccessToken('invalid-refresh-token')

    expect(result).toBeNull()
  })

  it('should return null for expired refreshToken', async () => {
    // The refreshTokens map is module-level, so we can directly test with a non-existent token
    // which will return null (simulating an expired token that was cleaned up)
    const result = await authService.refreshAccessToken('expired-token')
    expect(result).toBeNull()
  })

  it('should return null when user is disabled', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      password: 'hash',
      nickname: 'Test User',
      avatar: null,
      roles: '["admin"]',
      permissions: '["user:list"]',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockEm.findOne.mockResolvedValue(mockUser)

    const { refreshToken } = authService.generateToken(mockUser as any)

    // Simulate user being disabled after token was generated
    mockEm.findOne.mockResolvedValue(null)

    const result = await authService.refreshAccessToken(refreshToken)

    expect(result).toBeNull()
  })
})

describe('AuthService — revokeRefreshToken', () => {
  let authService: AuthService
  let mockEm: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockEm = {
      fork: vi.fn().mockReturnThis(),
      findOne: vi.fn(),
    }

    mockGetOrm.mockReturnValue({ em: mockEm })

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

  it('should revoke refreshToken so it cannot be used again', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      password: 'hash',
      nickname: 'Test User',
      avatar: null,
      roles: '["admin"]',
      permissions: '["user:list"]',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockEm.findOne.mockResolvedValue(mockUser)

    const { refreshToken } = authService.generateToken(mockUser as any)

    // Revoke the token
    authService.revokeRefreshToken(refreshToken)

    // After revocation, the token should not work
    const result = await authService.refreshAccessToken(refreshToken)
    expect(result).toBeNull()
  })

  it('should not throw when revoking non-existent token', () => {
    expect(() => authService.revokeRefreshToken('non-existent-token')).not.toThrow()
  })
})

describe('AuthService — registerOnline', () => {
  let authService: AuthService
  let mockOnlineUserService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockOnlineUserService = {
      register: vi.fn(),
      refresh: vi.fn(),
      remove: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      cleanExpired: vi.fn(),
      count: vi.fn(),
    }
    authService = new AuthService(mockOnlineUserService)
  })

  it('should call onlineUserService.register with correct parameters', () => {
    const token = 'test-access-token'
    const user = {
      id: '1',
      username: 'admin',
      nickname: 'Administrator',
      roles: '["admin"]',
      permissions: '["user:list", "user:create"]',
    }

    authService.registerOnline(token, user)

    expect(mockOnlineUserService.register).toHaveBeenCalledTimes(1)
    expect(mockOnlineUserService.register).toHaveBeenCalledWith({
      token,
      userId: '1',
      username: 'admin',
      nickname: 'Administrator',
      roles: ['admin'],
      permissions: ['user:list', 'user:create'],
      loginAt: expect.any(Number),
    })
  })

  it('should handle string roles and permissions', () => {
    const token = 'test-access-token'
    const user = {
      id: '2',
      username: 'editor',
      nickname: 'Editor User',
      roles: '["editor"]',
      permissions: '["content:read"]',
    }

    authService.registerOnline(token, user)

    expect(mockOnlineUserService.register).toHaveBeenCalledWith({
      token,
      userId: '2',
      username: 'editor',
      nickname: 'Editor User',
      roles: ['editor'],
      permissions: ['content:read'],
      loginAt: expect.any(Number),
    })
  })

  it('should handle array roles and permissions', () => {
    const token = 'test-access-token'
    const user = {
      id: '3',
      username: 'viewer',
      nickname: 'Viewer User',
      roles: ['viewer'],
      permissions: ['content:read'],
    }

    authService.registerOnline(token, user)

    expect(mockOnlineUserService.register).toHaveBeenCalledWith({
      token,
      userId: '3',
      username: 'viewer',
      nickname: 'Viewer User',
      roles: ['viewer'],
      permissions: ['content:read'],
      loginAt: expect.any(Number),
    })
  })
})
