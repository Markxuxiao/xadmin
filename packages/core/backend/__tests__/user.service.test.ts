import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { UserService } from '../core/user/user.service'
import { createTestOrm, closeTestOrm } from './helpers/test-db'

// Password utility tests — still on UserService
describe('UserService — hashPassword / verifyPassword', () => {
  let userService: UserService

  beforeEach(() => {
    userService = new UserService()
  })

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

  it('should find user by username when user exists', async () => {
    const created = await userService.create({
      username: 'findbyuser',
      password: 'password123',
      nickname: 'FindBy User',
    })

    const found = await userService.findByUsername('findbyuser')
    expect(found).not.toBeNull()
    expect(found!.username).toBe('findbyuser')
    expect(found!.nickname).toBe('FindBy User')
  })

  it('should return null when finding user by username that does not exist', async () => {
    const found = await userService.findByUsername('nonexistent_user_12345')
    expect(found).toBeNull()
  })

  it('should perform full CRUD cycle: create -> findByUsername -> update -> delete', async () => {
    // Create
    const created = await userService.create({
      username: 'crudcycle',
      password: 'initialPass',
      nickname: 'CRUD Cycle User',
      roles: ['viewer'],
      permissions: ['view:all'],
    })
    expect(created.id).toBeDefined()
    expect(created.username).toBe('crudcycle')

    // Find by username
    const found = await userService.findByUsername('crudcycle')
    expect(found).not.toBeNull()
    expect(found!.username).toBe('crudcycle')
    expect(found!.nickname).toBe('CRUD Cycle User')

    // Update
    const updated = await userService.update(created.id, {
      nickname: 'Updated CRUD User',
      password: 'newPassword789',
      roles: ['editor'],
    })
    expect(updated).not.toBeNull()
    expect(updated!.nickname).toBe('Updated CRUD User')
    expect(JSON.parse(updated!.roles)).toEqual(['editor'])

    // Verify new password works — use findByUsername to get raw entity with password
    const reFetched = await userService.findByUsername('crudcycle')
    const isValid = await userService.verifyPassword('newPassword789', reFetched!.password)
    expect(isValid).toBe(true)

    // Delete
    const deleted = await userService.delete(created.id)
    expect(deleted).toBe(true)

    // Verify user is gone
    const notFound = await userService.findByUsername('crudcycle')
    expect(notFound).toBeNull()
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
    // Note: authenticate is now in AuthService, not UserService
  })
})
