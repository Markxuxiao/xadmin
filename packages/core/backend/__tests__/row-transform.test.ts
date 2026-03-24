import { describe, it, expect } from 'vitest'
import { rowToUser, UserRow } from '../base/entities/user.entity'
import { rowToRole, RoleRow } from '../base/entities/role.entity'

describe('rowToUser', () => {
  it('should parse user row correctly', () => {
    const row: UserRow = {
      id: '1',
      username: 'admin',
      password: '$2b$10$hashed',
      nickname: '管理员',
      avatar: null,
      roles: '["admin"]',
      permissions: '["user:list","user:create"]',
      enabled: 1,
      created_at: '2026-01-01 10:00:00',
      updated_at: '2026-01-01 10:00:00',
      created_by: null,
      updated_by: null,
    }

    const user = rowToUser(row)

    expect(user.id).toBe('1')
    expect(user.username).toBe('admin')
    expect(user.nickname).toBe('管理员')
    expect(user.avatar).toBeNull()
    expect(user.roles).toEqual(['admin'])
    expect(user.permissions).toEqual(['user:list', 'user:create'])
    expect(user.enabled).toBe(true)
    expect(user.createdAt).toBe('2026-01-01 10:00:00')
    expect(user.updatedAt).toBe('2026-01-01 10:00:00')
  })

  it('should parse empty roles and permissions arrays', () => {
    const row: UserRow = {
      id: '2',
      username: 'test',
      password: 'hash',
      nickname: 'Test',
      avatar: null,
      roles: '[]',
      permissions: '[]',
      enabled: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      created_by: null,
      updated_by: null,
    }

    const user = rowToUser(row)
    expect(user.roles).toEqual([])
    expect(user.permissions).toEqual([])
    expect(user.enabled).toBe(false)
  })

  it('should parse multiple roles', () => {
    const row: UserRow = {
      id: '3',
      username: 'editor',
      password: 'hash',
      nickname: 'Editor',
      avatar: 'https://example.com/avatar.png',
      roles: '["admin","editor"]',
      permissions: '["user:list","content:edit"]',
      enabled: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      created_by: null,
      updated_by: null,
    }

    const user = rowToUser(row)
    expect(user.roles).toEqual(['admin', 'editor'])
    expect(user.permissions).toEqual(['user:list', 'content:edit'])
    expect(user.avatar).toBe('https://example.com/avatar.png')
  })
})

describe('rowToRole', () => {
  it('should parse role row correctly', () => {
    const row: RoleRow = {
      id: 'r1',
      name: '超级管理员',
      code: 'admin',
      description: '拥有所有权限',
      permissions: '["*"]',
      enabled: 1,
      created_at: '2026-01-01 10:00:00',
      updated_at: '2026-01-01 10:00:00',
      created_by: null,
      updated_by: null,
    }

    const role = rowToRole(row)

    expect(role.id).toBe('r1')
    expect(role.name).toBe('超级管理员')
    expect(role.code).toBe('admin')
    expect(role.description).toBe('拥有所有权限')
    expect(role.permissions).toEqual(['*'])
    expect(role.enabled).toBe(true)
    expect(role.createdAt).toBe('2026-01-01 10:00:00')
    expect(role.updatedAt).toBe('2026-01-01 10:00:00')
  })

  it('should handle null description', () => {
    const row: RoleRow = {
      id: 'r2',
      name: '普通用户',
      code: 'user',
      description: null,
      permissions: '["user:list"]',
      enabled: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      created_by: null,
      updated_by: null,
    }

    const role = rowToRole(row)
    expect(role.description).toBeNull()
    expect(role.permissions).toEqual(['user:list'])
  })

  it('should parse multiple permissions', () => {
    const row: RoleRow = {
      id: 'r3',
      name: 'Editor',
      code: 'editor',
      description: 'Editor role',
      permissions: '["content:read","content:write","content:delete"]',
      enabled: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      created_by: null,
      updated_by: null,
    }

    const role = rowToRole(row)
    expect(role.permissions).toEqual(['content:read', 'content:write', 'content:delete'])
    expect(role.enabled).toBe(false)
  })
})
