import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import * as bcrypt from 'bcrypt'
import { getOrm, User } from '../../base'
import { OnlineUserService } from '../online-user/online-user.service'

export interface TokenPayload {
  sub: string
  username: string
  nickname: string
  permissions: string[]
  roles: string[]
  iat: number
  exp: number
}

const _jwtSecret = process.env.JWT_SECRET
if (!_jwtSecret) {
  throw new Error('[Auth] JWT_SECRET environment variable is required but not set')
}
const JWT_SECRET: string = _jwtSecret

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
const refreshTokens = new Map<string, { userId: string; expiresAt: number }>()

@Injectable()
export class AuthService {
  constructor(
    private readonly onlineUserService: OnlineUserService,
  ) {}

  // ===== 从 UserService 移入的方法 =====

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

  async authenticate(username: string, password: string) {
    const em = getOrm().em.fork()
    const user = await em.findOne(User, { username, enabled: true })
    if (!user) return null
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return null
    return this.userToRow(user)
  }

  generateToken(user: { id: string; username: string; nickname: string; roles: string; permissions: string }): { accessToken: string; refreshToken: string; expiresAt: number } {
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 15 * 60 // 15 minutes

    let permissions: string[] = []
    let roles: string[] = []
    try {
      permissions = JSON.parse(user.permissions)
    } catch {
      // malformed JSON in DB — treat as empty
    }
    try {
      roles = JSON.parse(user.roles)
    } catch {
      // malformed JSON in DB — treat as empty
    }

    const payload = {
      sub: user.id,
      username: user.username,
      nickname: user.nickname,
      permissions,
      roles,
      iat: now,
      exp,
    }
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payloadB64}`).digest('base64url')
    const accessToken = `${header}.${payloadB64}.${sig}`

    // Generate refresh token
    const refreshToken = crypto.randomUUID()
    refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: Date.now() + REFRESH_TOKEN_TTL,
    })

    return {
      accessToken,
      refreshToken,
      expiresAt: exp * 1000,
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const tokenData = refreshTokens.get(refreshToken)
    if (!tokenData) return null
    if (Date.now() > tokenData.expiresAt) {
      refreshTokens.delete(refreshToken)
      return null
    }

    const em = getOrm().em.fork()
    const user = await em.findOne(User, { id: tokenData.userId, enabled: true })
    if (!user) return null

    // Delete old refresh token (rotation)
    refreshTokens.delete(refreshToken)
    return this.generateToken(this.userToRow(user))
  }

  revokeRefreshToken(refreshToken: string): void {
    refreshTokens.delete(refreshToken)
  }

  registerOnline(token: string, user: any): void {
    this.onlineUserService.register({
      token,
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles || [],
      permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || [],
      loginAt: Date.now(),
    })
  }

  // ===== 私有辅助方法 =====

  private userToRow(user: User) {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      roles: user.roles,
      permissions: user.permissions,
      enabled: user.enabled ? 1 : 0,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : String(user.updatedAt),
      created_by: null,
      updated_by: null,
    }
  }
}
