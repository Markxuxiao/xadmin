import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import * as bcrypt from 'bcrypt'
import { getOrm, User } from '../../base'

const JWT_SECRET = process.env.JWT_SECRET ?? 'xadmin-dev-secret-2026'

export interface TokenPayload {
  sub: string
  username: string
  nickname: string
  permissions: string[]
  roles: string[]
  iat: number
  exp: number
}

@Injectable()
export class UserService {
  // Hash a password using bcrypt
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  // Verify a password against a bcrypt hash
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // Verify JWT token
  verifyToken(token: string): TokenPayload | null {
    try {
      const [header, payload, sig] = token.split('.')
      const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url')
      if (sig !== expectedSig) return null
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenPayload
      if (decoded.exp < Math.floor(Date.now() / 1000)) return null
      return decoded
    } catch {
      return null
    }
  }

  // Get current user from token
  getCurrentUser(token: string) {
    const payload = this.verifyToken(token)
    if (!payload) return null
    return {
      id: payload.sub,
      username: payload.username,
      nickname: payload.nickname,
      permissions: payload.permissions,
      roles: payload.roles,
    }
  }

  // Authenticate user with username/password
  async authenticate(username: string, password: string) {
    const em = getOrm().em.fork()
    const user = await em.findOne(User, { username, enabled: true })
    if (!user) return null
    const valid = await this.verifyPassword(password, user.password)
    if (!valid) return null
    return this.userToRow(user)
  }

  // Generate JWT token for user
  generateToken(user: { id: string; username: string; nickname: string; roles: string; permissions: string }): { token: string; expiresAt: number } {
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 15 * 60 // 15 minutes
    const payload = {
      sub: user.id,
      username: user.username,
      nickname: user.nickname,
      permissions: JSON.parse(user.permissions),
      roles: JSON.parse(user.roles),
      iat: now,
      exp,
    }
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payloadB64}`).digest('base64url')
    return {
      token: `${header}.${payloadB64}.${sig}`,
      expiresAt: exp * 1000,
    }
  }

  // Convert MikroORM User entity to row-compatible shape
  private userToRow(user: User) {
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      nickname: user.nickname,
      avatar: user.avatar,
      roles: user.roles,
      permissions: user.permissions,
      enabled: user.enabled ? 1 : 0,
      created_at: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
      updated_at: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : String(user.updatedAt),
      created_by: null,
      updated_by: null,
    }
  }

  // CRUD operations

  /**
   * Find all users with optional data scope filter.
   * @param dataScopeFilter - Optional MikroORM filter from DataPermissionGuard
   */
  async findAll(dataScopeFilter?: Record<string, any>) {
    const em = getOrm().em.fork()
    const filter = dataScopeFilter
      ? { ...dataScopeFilter }
      : {}
    const users = await em.find(User, { ...filter, deletedAt: null })
    return users.map(u => this.userToRow(u))
  }

  async findOne(id: string) {
    const em = getOrm().em.fork()
    const user = await em.findOne(User, { id, deletedAt: null })
    return user ? this.userToRow(user) : null
  }

  async create(data: { username: string; password: string; nickname: string; roles?: string[]; permissions?: string[] }) {
    const em = getOrm().em.fork()
    const hashedPassword = await this.hashPassword(data.password)
    const now = new Date()
    const user = em.create(User, {
      id: crypto.randomUUID(),
      username: data.username,
      password: hashedPassword,
      nickname: data.nickname,
      avatar: null,
      roles: JSON.stringify(data.roles ?? []),
      permissions: JSON.stringify(data.permissions ?? []),
      enabled: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })
    await em.persistAndFlush(user)
    return this.userToRow(user)
  }

  async update(id: string, data: Partial<{ password: string; nickname: string; roles: string[]; permissions: string[]; enabled: boolean }>) {
    const em = getOrm().em.fork()
    const user = await em.findOne(User, { id })
    if (!user) return null

    if (data.password !== undefined) {
      user.password = await this.hashPassword(data.password)
    }
    if (data.nickname !== undefined) { user.nickname = data.nickname }
    if (data.roles !== undefined) { user.roles = JSON.stringify(data.roles) }
    if (data.permissions !== undefined) { user.permissions = JSON.stringify(data.permissions) }
    if (data.enabled !== undefined) { user.enabled = data.enabled }
    user.updatedAt = new Date()

    await em.flush()
    return this.userToRow(user)
  }

  async delete(id: string) {
    const em = getOrm().em.fork()
    const user = await em.findOne(User, { id })
    if (!user) return false
    user.deletedAt = new Date()
    await em.flush()
    return true
  }
}
