import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'

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
}
