import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'

const JWT_SECRET = 'xadmin-dev-secret-2026'
const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

export interface TokenPayload {
  sub: string // user id
  username: string
  nickname: string
  permissions: string[]
  roles: string[]
  iat: number
  exp: number
}

@Injectable()
export class AuthService {
  // Mock user DB
  private readonly users = [
    {
      id: '1',
      username: 'admin',
      password: 'admin',
      nickname: '管理员',
      permissions: ['user:list', 'user:create', 'user:edit', 'user:delete'],
      roles: ['admin'],
    },
  ]

  validateUser(username: string, password: string) {
    return this.users.find(u => u.username === username && u.password === password) ?? null
  }

  generateToken(user: Omit<typeof this.users[0], 'password'>) {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      username: user.username,
      nickname: user.nickname,
      permissions: user.permissions,
      roles: user.roles,
    }
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const exp = now + Math.floor(TOKEN_TTL_MS / 1000)
    const payloadStr = Buffer.from(JSON.stringify({ ...payload, iat: now, exp })).toString('base64url')
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payloadStr}`).digest('base64url')
    return `${header}.${payloadStr}.${sig}`
  }

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
}
