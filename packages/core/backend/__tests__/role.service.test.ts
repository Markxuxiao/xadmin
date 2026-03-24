import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { RoleService } from '../core/role/role.service'
import { createTestOrm, closeTestOrm } from './helpers/test-db'

describe('RoleService — CRUD (PostgreSQL)', () => {
  let roleService: RoleService

  beforeAll(async () => {
    await createTestOrm()
  })

  beforeEach(async () => {
    roleService = new RoleService()
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  it('should find all roles', async () => {
    const roles = await roleService.findAll()
    expect(roles.length).toBeGreaterThanOrEqual(1)
    expect(roles[0].code).toBe('admin')
  })

  it('should find role by id', async () => {
    const roles = await roleService.findAll()
    const adminRole = roles.find(r => r.code === 'admin')!

    const found = await roleService.findOne(adminRole.id)
    expect(found).not.toBeNull()
    expect(found!.code).toBe('admin')
  })

  it('should return null for non-existent id', async () => {
    const found = await roleService.findOne('00000000-0000-0000-0000-000000000999')
    expect(found).toBeNull()
  })

  it('should find role by code', async () => {
    const found = await roleService.findByCode('admin')
    expect(found).not.toBeNull()
    expect(found!.code).toBe('admin')
  })

  it('should return null for non-existent code', async () => {
    const found = await roleService.findByCode('nonexistent')
    expect(found).toBeNull()
  })

  it('should create a new role', async () => {
    const role = await roleService.create({
      name: 'Editor',
      code: 'editor',
      description: 'Editor role',
      permissions: ['content:read', 'content:write'],
    })

    expect(role).not.toBeNull()
    expect(role.name).toBe('Editor')
    expect(role.code).toBe('editor')
    expect(role.permissions).toEqual(['content:read', 'content:write'])
  })

  it('should create role with minimal fields', async () => {
    const role = await roleService.create({
      name: 'Viewer',
      code: 'viewer',
    })

    expect(role).not.toBeNull()
    expect(role.description).toBeNull()
    expect(role.permissions).toEqual([])
  })

  it('should update role fields', async () => {
    const created = await roleService.create({
      name: 'ToUpdate',
      code: 'to_update',
      description: 'Original description',
      permissions: ['user:list'],
    })

    const updated = await roleService.update(created!.id, {
      name: 'UpdatedName',
      description: 'New description',
      permissions: ['user:list', 'user:create'],
    })

    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('UpdatedName')
    expect(updated!.description).toBe('New description')
    expect(updated!.permissions).toEqual(['user:list', 'user:create'])
  })

  it('should return null when updating non-existent role', async () => {
    const result = await roleService.update('00000000-0000-0000-0000-000000000999', { name: 'Test' })
    expect(result).toBeNull()
  })

  it('should update only specified fields', async () => {
    const created = await roleService.create({
      name: 'PartialUpdate',
      code: 'partial_update',
      description: 'Original',
      permissions: ['a'],
    })

    const updated = await roleService.update(created!.id, { name: 'NewName' })

    expect(updated!.name).toBe('NewName')
    expect(updated!.description).toBe('Original')
    expect(updated!.permissions).toEqual(['a'])
  })

  it('should soft-delete non-admin role', async () => {
    const created = await roleService.create({
      name: 'Deletable',
      code: 'deletable',
    })

    const result = await roleService.delete(created!.id)
    expect(result.success).toBe(true)

    const found = await roleService.findOne(created!.id)
    expect(found).toBeNull()
  })

  it('should prevent deletion of admin role', async () => {
    const adminRole = await roleService.findByCode('admin')
    const result = await roleService.delete(adminRole!.id)
    expect(result.success).toBe(false)
    expect(result.message).toBe('不能删除管理员角色')

    const admin = await roleService.findOne(adminRole!.id)
    expect(admin).not.toBeNull()
  })

  it('should return success:false when deleting non-existent role', async () => {
    const result = await roleService.delete('00000000-0000-0000-0000-000000000999')
    expect(result.success).toBe(false)
  })
})
