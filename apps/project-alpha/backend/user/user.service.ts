import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { getDb, rowToUser, UserRow } from '../entities'

const JWT_SECRET = 'xadmin-dev-secret-2026'

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
  private db = getDb()

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
  authenticate(username: string, password: string): UserRow | null {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ? AND enabled = 1').get(username) as UserRow | undefined
    if (!row) return null
    if (row.password !== password) return null
    return row
  }

  // Generate JWT token for user
  generateToken(user: UserRow): { token: string; expiresAt: number } {
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

  // CRUD operations
  findAll() {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as UserRow[]
    return rows.map(rowToUser)
  }

  findOne(id: string) {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
    return row ? rowToUser(row) : null
  }

  create(data: { username: string; password: string; nickname: string; roles?: string[]; permissions?: string[] }) {
    const id = Date.now().toString()
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO users (id, username, password, nickname, roles, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.username, data.password, data.nickname, JSON.stringify(data.roles ?? []), JSON.stringify(data.permissions ?? []), now, now)
    return this.findOne(id)
  }

  update(id: string, data: Partial<{ password: string; nickname: string; roles: string[]; permissions: string[]; enabled: boolean }>) {
    const existing = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
    if (!existing) return null

    const updates: string[] = []
    const values: any[] = []

    if (data.password !== undefined) { updates.push('password = ?'); values.push(data.password) }
    if (data.nickname !== undefined) { updates.push('nickname = ?'); values.push(data.nickname) }
    if (data.roles !== undefined) { updates.push('roles = ?'); values.push(JSON.stringify(data.roles)) }
    if (data.permissions !== undefined) { updates.push('permissions = ?'); values.push(JSON.stringify(data.permissions)) }
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0) }
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    this.db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return this.findOne(id)
  }

  delete(id: string) {
    const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id)
    return result.changes > 0
  }
}
