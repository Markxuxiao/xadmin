import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UserService } from '../core/user/user.service'
import { createTestOrm, closeTestOrm } from './helpers/test-db'

// Token/JWT tests — no DB needed, mock getOrm
describe('UserService — token/JWT (no DB)', () => {
  let userService: UserService

  beforeEach(() => {
    vi.clearAllMocks()
    userService = new UserService()
  })

  describe('verifyToken', () => {
    it('should return null for invalid token format', () => {
      expect(userService.verifyToken('not-a-jwt')).toBeNull()
      expect(userService.verifyToken('')).toBeNull()
      expect(userService.verifyToken('a.b')).toBeNull()
    })

    it('should return null for tampered token', () => {
      const token = userService.generateToken({
        id: '1',
        username: 'admin',
        password: 'hash',
        nickname: 'Admin',
        avatar: null,
        roles: '["admin"]',
        permissions: '["*"]',
        enabled: 1,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        created_by: null,
        updated_by: null,
      })

      const [h, p] = token.token.split('.')
      const tampered = `${h}.${p}.wrong_signature`
      expect(userService.verifyToken(tampered)).toBeNull()
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

      expect(userService.verifyToken(expiredToken)).toBeNull()
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

      const { token, expiresAt } = userService.generateToken(user)

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

      const { token } = userService.generateToken(user)
      const payload = userService.verifyToken(token)

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
      expect(userService.getCurrentUser('invalid')).toBeNull()
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

      const { token } = userService.generateToken(user)
      const currentUser = userService.getCurrentUser(token)

      expect(currentUser).not.toBeNull()
      expect(currentUser!.id).toBe('1')
      expect(currentUser!.username).toBe('admin')
      expect(currentUser!.nickname).toBe('Administrator')
      expect(currentUser!.roles).toEqual(['admin'])
      expect(currentUser!.permissions).toEqual(['user:list', 'user:create'])
    })
  })

  describe('hashPassword / verifyPassword', () => {
    it('should hash and verify password correctly', async () => {
      const password = 'mySecretPassword123'
      const hash = await userService.hashPassword(password)

      expect(hash).not.toBe(password)
      expect(hash.startsWith('$2b$')).toBe(true)

      const isValid = await userService.verifyPassword(password, hash)
      expect(isValid).toBe(true)

      const isInvalid = await userService.verifyPassword('wrongpassword', hash)
      expect(isInvalid).toBe(false)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'samePassword'
      const hash1 = await userService.hashPassword(password)
      const hash2 = await userService.hashPassword(password)

      expect(hash1).not.toBe(hash2)
      expect(await userService.verifyPassword(password, hash1)).toBe(true)
      expect(await userService.verifyPassword(password, hash2)).toBe(true)
    })
  })
})

// CRUD tests — need real PostgreSQL database
describe('UserService — CRUD (PostgreSQL)', () => {
  let userService: UserService

  beforeAll(async () => {
    await createTestOrm()
  })

  beforeEach(async () => {
    userService = new UserService()
  })

  it('should create, find, update, and delete user', async () => {
    const created = await userService.create({
      username: 'newuser',
      password: 'password123',
      nickname: 'New User',
      roles: ['editor'],
      permissions: ['content:read'],
    })

    expect(created).not.toBeNull()
    expect(created.username).toBe('newuser')
    expect(created.nickname).toBe('New User')
    expect(JSON.parse(created.roles)).toEqual(['editor'])
    expect(JSON.parse(created.permissions)).toEqual(['content:read'])
    expect(created.enabled).toBe(1)
    expect(created.id).toBeDefined()

    const all = await userService.findAll()
    expect(all.length).toBeGreaterThanOrEqual(1)
    expect(all.some(u => u.username === 'newuser')).toBe(true)

    const found = await userService.findOne(created.id)
    expect(found).not.toBeNull()
    expect(found!.username).toBe('newuser')

    const updated = await userService.update(created.id, {
      nickname: 'Updated Nickname',
      roles: ['admin'],
    })
    expect(updated).not.toBeNull()
    expect(updated!.nickname).toBe('Updated Nickname')
    expect(JSON.parse(updated!.roles)).toEqual(['admin'])

    const deleted = await userService.delete(created.id)
    expect(deleted).toBe(true)

    const notFound = await userService.findOne(created.id)
    expect(notFound).toBeNull()
  })

  it('should return null when updating non-existent user', async () => {
    const result = await userService.update('00000000-0000-0000-0000-000000000999', { nickname: 'Test' })
    expect(result).toBeNull()
  })

  it('should return false when deleting non-existent user', async () => {
    const result = await userService.delete('00000000-0000-0000-0000-000000000999')
    expect(result).toBe(false)
  })

  it('should update password correctly', async () => {
    const user = await userService.create({
      username: 'pwuser',
      password: 'original',
      nickname: 'PW User',
    })

    const newPassword = 'newPassword456'
    const updated = await userService.update(user!.id, { password: newPassword })

    expect(updated).not.toBeNull()

    const authResult = await userService.authenticate('pwuser', newPassword)
    expect(authResult).not.toBeNull()

    const oldAuth = await userService.authenticate('pwuser', 'original')
    expect(oldAuth).toBeNull()
  })

  it('should authenticate valid credentials', async () => {
    await userService.create({
      username: 'authuser',
      password: 'correctPassword',
      nickname: 'Auth User',
      roles: ['user'],
      permissions: ['user:list'],
    })

    const result = await userService.authenticate('authuser', 'correctPassword')
    expect(result).not.toBeNull()
    expect(result!.username).toBe('authuser')
  })

  it('should return null for wrong password', async () => {
    await userService.create({
      username: 'authuser2',
      password: 'correctPassword',
      nickname: 'Auth User 2',
    })

    const result = await userService.authenticate('authuser2', 'wrongPassword')
    expect(result).toBeNull()
  })

  it('should return null for non-existent user', async () => {
    const result = await userService.authenticate('nonexistent', 'anypassword')
    expect(result).toBeNull()
  })
})
