import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import * as crypto from 'crypto'
import { MikroORM } from '@mikro-orm/postgresql'
import { User } from '../base/entities/user.entity'
import { Role } from '../base/entities/role.entity'
import { createTestOrm, closeTestOrm } from './helpers/test-db'
import * as bcrypt from 'bcrypt'

describe('User Entity (MikroORM + PostgreSQL)', () => {
  let orm: MikroORM
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let em: any

  beforeAll(async () => {
    orm = await createTestOrm()
  })

  beforeEach(async () => {
    // Fork a fresh EntityManager for each test to avoid state pollution
    em = orm.em.fork()
    // Clear tables between tests to avoid unique constraint conflicts
    await em.nativeDelete(User, {})
    await em.nativeDelete(Role, {})
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  describe('CRUD via EntityManager', () => {
    it('should create and persist a user', async () => {
      const passwordHash = await bcrypt.hash('password123', 10)
      const user = em.create(User, {
        id: crypto.randomUUID(),
        username: 'testuser',
        password: passwordHash,
        nickname: 'Test User',
        avatar: null,
        roles: JSON.stringify(['user']),
        permissions: JSON.stringify(['user:list']),
        enabled: true,
        deletedAt: null,
      })

      await em.persistAndFlush(user)
      em.clear()

      const found = await em.findOne(User, { id: user.id })
      expect(found).not.toBeNull()
      expect(found!.username).toBe('testuser')
      expect(found!.nickname).toBe('Test User')
      expect(found!.roles).toBe('["user"]')
      expect(found!.permissions).toBe('["user:list"]')
    })

    it('should create user with avatar', async () => {
      const passwordHash = await bcrypt.hash('pass', 10)
      const user = em.create(User, {
        id: crypto.randomUUID(),
        username: 'userwithavatar',
        password: passwordHash,
        nickname: 'Avatar User',
        avatar: 'https://example.com/avatar.png',
        roles: JSON.stringify([]),
        permissions: JSON.stringify([]),
        enabled: true,
        deletedAt: null,
      })

      await em.persistAndFlush(user)
      em.clear()

      const found = await em.findOne(User, { id: user.id })
      expect(found!.avatar).toBe('https://example.com/avatar.png')
    })

    it('should update user nickname', async () => {
      const passwordHash = await bcrypt.hash('pass', 10)
      const user = em.create(User, {
        id: crypto.randomUUID(),
        username: 'updatable',
        password: passwordHash,
        nickname: 'Old Nickname',
        roles: JSON.stringify([]),
        permissions: JSON.stringify([]),
        enabled: true,
        deletedAt: null,
      })
      await em.persistAndFlush(user)

      em.clear()
      const toUpdate = await em.findOne(User, { id: user.id })
      toUpdate!.nickname = 'New Nickname'
      await em.flush()
      em.clear()

      const found = await em.findOne(User, { id: user.id })
      expect(found!.nickname).toBe('New Nickname')
    })

    it('should verify password with bcrypt', async () => {
      const password = 'mySecurePassword'
      const passwordHash = await bcrypt.hash(password, 10)
      const user = em.create(User, {
        id: crypto.randomUUID(),
        username: 'bcryptuser',
        password: passwordHash,
        nickname: 'Bcrypt User',
        roles: JSON.stringify([]),
        permissions: JSON.stringify([]),
        enabled: true,
        deletedAt: null,
      })
      await em.persistAndFlush(user)

      const isValid = await bcrypt.compare(password, user.password)
      expect(isValid).toBe(true)

      const isInvalid = await bcrypt.compare('wrongpassword', user.password)
      expect(isInvalid).toBe(false)
    })

    it('should soft-delete a user (set deletedAt)', async () => {
      const passwordHash = await bcrypt.hash('pass', 10)
      const user = em.create(User, {
        id: crypto.randomUUID(),
        username: 'todelete',
        password: passwordHash,
        nickname: 'To Delete',
        roles: JSON.stringify([]),
        permissions: JSON.stringify([]),
        enabled: true,
        deletedAt: null,
      })
      await em.persistAndFlush(user)

      em.clear()
      const toDelete = await em.findOne(User, { id: user.id })
      toDelete!.deletedAt = new Date()
      await em.flush()
      em.clear()

      // Without filter, should still find it
      const found = await em.findOne(User, { id: user.id })
      expect(found).not.toBeNull()

      // With explicit deletedAt condition, should not find it
      const filtered = await em.find(User, { id: user.id, deletedAt: null })
      expect(filtered.length).toBe(0)
    })
  })
})
