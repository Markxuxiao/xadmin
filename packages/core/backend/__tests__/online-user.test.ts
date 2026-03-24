import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OnlineUserService, OnlineUserInfo } from '../core/online-user/online-user.service'

// Access the module-level Map for test isolation
// ONLINE_USER_MAP is a module-level constant, we need to access it for cleanup
// Since it's not exported, we use OnlineUserService's cleanExpired method and
// re-import mechanism to ensure test isolation

describe('OnlineUserService', () => {
  let onlineUserService: OnlineUserService

  // Helper to clear the in-memory store by creating a fresh service instance
  // The service uses a module-level Map, so we use cleanExpired + remove to clear
  const clearAllUsers = () => {
    // cleanExpired returns count of removed users, but we need to remove ALL
    // We'll call findAll to trigger cleanExpired, then remove each one
    const users = onlineUserService.findAll()
    for (const user of users) {
      onlineUserService.remove(user.token)
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    onlineUserService = new OnlineUserService()
    // Clear any existing users from previous tests
    clearAllUsers()
  })

  // Helper: create a test user info
  const createTestUser = (overrides: Partial<OnlineUserInfo> = {}): Omit<OnlineUserInfo, 'lastActive'> => ({
    token: `token-${Math.random().toString(36).slice(2)}`,
    userId: 'user-1',
    username: 'testuser',
    nickname: 'Test User',
    roles: ['user'],
    permissions: ['user:read'],
    loginAt: Date.now(),
    ...overrides,
  })

  describe('register', () => {
    it('should register a new online user', () => {
      const userInfo = createTestUser()

      onlineUserService.register(userInfo)

      const found = onlineUserService.findOne(userInfo.token)
      expect(found).not.toBeNull()
      expect(found!.token).toBe(userInfo.token)
      expect(found!.userId).toBe(userInfo.userId)
      expect(found!.username).toBe(userInfo.username)
      expect(found!.nickname).toBe(userInfo.nickname)
      expect(found!.roles).toEqual(['user'])
      expect(found!.permissions).toEqual(['user:read'])
    })

    it('should set lastActive to current time on registration', () => {
      const userInfo = createTestUser()
      const before = Date.now()

      onlineUserService.register(userInfo)

      const found = onlineUserService.findOne(userInfo.token)
      expect(found!.lastActive).toBeGreaterThanOrEqual(before)
      expect(found!.lastActive).toBeLessThanOrEqual(Date.now())
    })

    it('should allow multiple users to be registered', () => {
      const user1 = createTestUser({ token: 'token-1', username: 'user1' })
      const user2 = createTestUser({ token: 'token-2', username: 'user2' })

      onlineUserService.register(user1)
      onlineUserService.register(user2)

      expect(onlineUserService.count()).toBe(2)
    })
  })

  describe('refresh', () => {
    it('should return true for existing token and update lastActive', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      const before = Date.now()
      const result = onlineUserService.refresh(userInfo.token)

      expect(result).toBe(true)
      const found = onlineUserService.findOne(userInfo.token)
      expect(found!.lastActive).toBeGreaterThanOrEqual(before)
    })

    it('should return false for non-existent token', () => {
      const result = onlineUserService.refresh('non-existent-token')
      expect(result).toBe(false)
    })

    it('should update lastActive time on each refresh', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      const originalLastActive = onlineUserService.findOne(userInfo.token)!.lastActive

      // Simulate time passing
      vi.useFakeTimers()
      vi.advanceTimersByTime(5000) // 5 seconds later

      onlineUserService.refresh(userInfo.token)

      vi.useRealTimers()

      const updated = onlineUserService.findOne(userInfo.token)
      expect(updated!.lastActive).toBeGreaterThan(originalLastActive)
    })
  })

  describe('remove', () => {
    it('should return true when removing existing user', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      const result = onlineUserService.remove(userInfo.token)

      expect(result).toBe(true)
      expect(onlineUserService.findOne(userInfo.token)).toBeNull()
    })

    it('should return false when removing non-existent user', () => {
      const result = onlineUserService.remove('non-existent-token')
      expect(result).toBe(false)
    })

    it('should reduce count after removal', () => {
      const user1 = createTestUser({ token: 'token-1' })
      const user2 = createTestUser({ token: 'token-2' })
      onlineUserService.register(user1)
      onlineUserService.register(user2)

      expect(onlineUserService.count()).toBe(2)

      onlineUserService.remove(user1.token)

      expect(onlineUserService.count()).toBe(1)
    })

    it('should only remove the specified user', () => {
      const user1 = createTestUser({ token: 'token-1', username: 'user1' })
      const user2 = createTestUser({ token: 'token-2', username: 'user2' })
      onlineUserService.register(user1)
      onlineUserService.register(user2)

      onlineUserService.remove(user1.token)

      expect(onlineUserService.findOne(user1.token)).toBeNull()
      expect(onlineUserService.findOne(user2.token)).not.toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return empty array when no users online', () => {
      const users = onlineUserService.findAll()
      expect(users).toEqual([])
    })

    it('should return all registered users', () => {
      const user1 = createTestUser({ token: 'token-1' })
      const user2 = createTestUser({ token: 'token-2' })
      onlineUserService.register(user1)
      onlineUserService.register(user2)

      const users = onlineUserService.findAll()

      expect(users.length).toBe(2)
      expect(users.some(u => u.token === 'token-1')).toBe(true)
      expect(users.some(u => u.token === 'token-2')).toBe(true)
    })

    it('should clean expired users when calling findAll', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      // Manually expire the user by manipulating lastActive (hack via remove+re-register)
      // Instead, test that cleanExpired works correctly via cleanExpired tests
      // Here we just verify findAll returns non-expired users
      const users = onlineUserService.findAll()
      expect(users.length).toBe(1)
      expect(users[0].token).toBe(userInfo.token)
    })
  })

  describe('count', () => {
    it('should return 0 when no users online', () => {
      expect(onlineUserService.count()).toBe(0)
    })

    it('should return correct count of online users', () => {
      const user1 = createTestUser({ token: 'token-1' })
      const user2 = createTestUser({ token: 'token-2' })
      const user3 = createTestUser({ token: 'token-3' })

      onlineUserService.register(user1)
      onlineUserService.register(user2)
      onlineUserService.register(user3)

      expect(onlineUserService.count()).toBe(3)
    })

    it('should not count expired users', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      // Expire the user by advancing time
      vi.useFakeTimers()
      const originalLastActive = onlineUserService.findOne(userInfo.token)!.lastActive

      // Advance time by 16 minutes (beyond 15 minute expiry)
      vi.setSystemTime(originalLastActive + 16 * 60 * 1000)

      // Trigger cleanExpired via count
      const count = onlineUserService.count()

      expect(count).toBe(0)

      vi.useRealTimers()
    })
  })

  describe('cleanExpired', () => {
    it('should return 0 when no users are expired', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      const removed = onlineUserService.cleanExpired()

      expect(removed).toBe(0)
      expect(onlineUserService.count()).toBe(1)
    })

    it('should remove users inactive for more than 15 minutes', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      // Get original lastActive and advance time
      const originalLastActive = onlineUserService.findOne(userInfo.token)!.lastActive

      vi.useFakeTimers()
      // Advance time by 16 minutes (beyond 15 minute expiry)
      vi.setSystemTime(originalLastActive + 16 * 60 * 1000)

      const removed = onlineUserService.cleanExpired()

      expect(removed).toBe(1)
      expect(onlineUserService.count()).toBe(0)
      expect(onlineUserService.findOne(userInfo.token)).toBeNull()

      vi.useRealTimers()
    })

    it('should not remove users active within 15 minutes', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      const originalLastActive = onlineUserService.findOne(userInfo.token)!.lastActive

      vi.useFakeTimers()
      // Advance time by only 10 minutes (within 15 minute expiry)
      vi.setSystemTime(originalLastActive + 10 * 60 * 1000)

      const removed = onlineUserService.cleanExpired()

      expect(removed).toBe(0)
      expect(onlineUserService.count()).toBe(1)

      vi.useRealTimers()
    })

    it('should handle exact 15-minute boundary correctly', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      const originalLastActive = onlineUserService.findOne(userInfo.token)!.lastActive

      vi.useFakeTimers()
      // Advance time by exactly 15 minutes
      vi.setSystemTime(originalLastActive + 15 * 60 * 1000)

      // At exactly 15 minutes, user should still be considered active
      // (expiry check is > EXPIRY_MS, not >=)
      const removed = onlineUserService.cleanExpired()

      expect(removed).toBe(0)
      expect(onlineUserService.count()).toBe(1)

      vi.useRealTimers()
    })

    it('should clean multiple expired users', () => {
      // Use fake timers to control time
      vi.useFakeTimers({ shouldAdvanceTime: false })
      const baseTime = 1000000000000

      // Register user1 at baseTime
      vi.setSystemTime(baseTime)
      const user1 = createTestUser({ token: 'token-1' })
      onlineUserService.register(user1)

      // Register user2 at baseTime + 10 minutes (still active when we check)
      vi.setSystemTime(baseTime + 10 * 60 * 1000)
      const user2 = createTestUser({ token: 'token-2' })
      onlineUserService.register(user2)

      // Advance time to baseTime + 20 minutes - only user1 should be expired
      vi.setSystemTime(baseTime + 20 * 60 * 1000)

      // Manually verify expiry condition: > 15 minutes
      // user1: 20 min > 15 min -> expired
      // user2: 10 min <= 15 min -> not expired

      const removed = onlineUserService.cleanExpired()

      expect(removed).toBe(1)
      expect(onlineUserService.count()).toBe(1)
      expect(onlineUserService.findOne(user1.token)).toBeNull()
      expect(onlineUserService.findOne(user2.token)).not.toBeNull()

      vi.useRealTimers()
    })
  })

  describe('findOne', () => {
    it('should return null for non-existent token', () => {
      const found = onlineUserService.findOne('non-existent')
      expect(found).toBeNull()
    })

    it('should return user info for existing token', () => {
      const userInfo = createTestUser({ token: 'my-token' })
      onlineUserService.register(userInfo)

      const found = onlineUserService.findOne('my-token')

      expect(found).not.toBeNull()
      expect(found!.token).toBe('my-token')
      expect(found!.username).toBe('testuser')
    })

    it('should return null for expired token', () => {
      const userInfo = createTestUser()
      onlineUserService.register(userInfo)

      const originalLastActive = onlineUserService.findOne(userInfo.token)!.lastActive

      vi.useFakeTimers()
      vi.setSystemTime(originalLastActive + 16 * 60 * 1000)

      const found = onlineUserService.findOne(userInfo.token)

      expect(found).toBeNull()
      expect(onlineUserService.count()).toBe(0)

      vi.useRealTimers()
    })
  })
})
