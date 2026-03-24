import { Injectable } from '@nestjs/common'

export interface OnlineUserInfo {
  token: string
  userId: string
  username: string
  nickname: string
  roles: string[]
  permissions: string[]
  loginAt: number
  lastActive: number
}

const ONLINE_USER_MAP = new Map<string, OnlineUserInfo>()
const EXPIRY_MS = 15 * 60 * 1000 // 15 minutes

@Injectable()
export class OnlineUserService {
  // Register a user as online
  register(userInfo: Omit<OnlineUserInfo, 'lastActive'>): void {
    ONLINE_USER_MAP.set(userInfo.token, {
      ...userInfo,
      lastActive: Date.now(),
    })
  }

  // Refresh user's last active time (heartbeat)
  refresh(token: string): boolean {
    const user = ONLINE_USER_MAP.get(token)
    if (!user) return false
    user.lastActive = Date.now()
    return true
  }

  // Remove a user from online list (logout/force logout)
  remove(token: string): boolean {
    return ONLINE_USER_MAP.delete(token)
  }

  // Get all online users
  findAll(): OnlineUserInfo[] {
    this.cleanExpired()
    return Array.from(ONLINE_USER_MAP.values())
  }

  // Get a specific online user by token
  findOne(token: string): OnlineUserInfo | null {
    const user = ONLINE_USER_MAP.get(token)
    if (!user) return null
    // Check if expired
    if (Date.now() - user.lastActive > EXPIRY_MS) {
      ONLINE_USER_MAP.delete(token)
      return null
    }
    return user
  }

  // Clean up expired tokens (15 minutes of inactivity)
  cleanExpired(): number {
    const now = Date.now()
    let removed = 0
    for (const [token, user] of ONLINE_USER_MAP.entries()) {
      if (now - user.lastActive > EXPIRY_MS) {
        ONLINE_USER_MAP.delete(token)
        removed++
      }
    }
    return removed
  }

  // Get online user count
  count(): number {
    this.cleanExpired()
    return ONLINE_USER_MAP.size
  }
}
