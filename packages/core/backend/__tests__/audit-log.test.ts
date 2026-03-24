import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { AuditLogService } from '../core/audit-log/audit-log.service'
import { createTestOrm, closeTestOrm, getOrm } from './helpers/test-db'
import { AuditLog } from '../base/entities/audit-log.entity'

describe('AuditLogService', () => {
  let auditLogService: AuditLogService

  beforeAll(async () => {
    await createTestOrm()
    auditLogService = new AuditLogService()
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  // -------------------------------------------------------------------------
  // findAll — pagination and filters
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    it('should return paginated audit logs with total count', async () => {
      // Create two logs first
      await auditLogService.create({
        action: 'create',
        entity: 'User',
        operatorId: 'admin',
        operatorName: '管理员',
        path: '/users',
        method: 'POST',
        statusCode: 201,
      })
      await auditLogService.create({
        action: 'query',
        entity: 'User',
        operatorId: 'admin',
        operatorName: '管理员',
        path: '/users',
        method: 'GET',
        statusCode: 200,
      })

      const result = await auditLogService.findAll({ page: 1, pageSize: 10 })

      expect(result.data.length).toBeGreaterThanOrEqual(2)
      expect(result.total).toBeGreaterThanOrEqual(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
    })

    it('should filter by action', async () => {
      await auditLogService.create({
        action: 'delete',
        entity: 'User',
        operatorId: 'admin',
        operatorName: '管理员',
        path: '/users/1',
        method: 'DELETE',
        statusCode: 200,
      })

      const result = await auditLogService.findAll({ action: 'delete' })

      expect(result.data.every(log => log.action === 'delete')).toBe(true)
    })

    it('should filter by entity', async () => {
      await auditLogService.create({
        action: 'update',
        entity: 'Role',
        operatorId: 'admin',
        operatorName: '管理员',
        path: '/roles/1',
        method: 'PUT',
        statusCode: 200,
      })

      const result = await auditLogService.findAll({ entity: 'Role' })

      expect(result.data.every(log => log.entity === 'Role')).toBe(true)
    })

    it('should filter by operatorId', async () => {
      await auditLogService.create({
        action: 'create',
        entity: 'Dict',
        operatorId: 'user-123',
        operatorName: '测试用户',
        path: '/dicts',
        method: 'POST',
        statusCode: 201,
      })

      const result = await auditLogService.findAll({ operatorId: 'user-123' })

      expect(result.data.every(log => log.operatorId === 'user-123')).toBe(true)
    })

    it('should filter by date range (startDate, endDate)', async () => {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const startDate = yesterday.toISOString()
      const endDate = tomorrow.toISOString()

      const result = await auditLogService.findAll({ startDate, endDate })

      expect(result.data.length).toBeGreaterThanOrEqual(1)
    })

    it('should respect pagination parameters', async () => {
      // Create 3 logs
      for (let i = 0; i < 3; i++) {
        await auditLogService.create({
          action: 'query',
          entity: 'Test',
          operatorId: 'admin',
          operatorName: '管理员',
          path: `/test/${i}`,
          method: 'GET',
          statusCode: 200,
        })
      }

      const page1 = await auditLogService.findAll({ page: 1, pageSize: 2 })
      const page2 = await auditLogService.findAll({ page: 2, pageSize: 2 })

      expect(page1.data.length).toBe(2)
      expect(page1.page).toBe(1)
      expect(page1.pageSize).toBe(2)
      expect(page2.data.length).toBeGreaterThanOrEqual(1)
      expect(page2.page).toBe(2)
      expect(page2.pageSize).toBe(2)
    })
  })

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------

  describe('findOne', () => {
    it('should return audit log when it exists', async () => {
      const created = await auditLogService.create({
        action: 'update',
        entity: 'User',
        entityId: 'user-456',
        operatorId: 'admin',
        operatorName: '管理员',
        path: '/users/user-456',
        method: 'PUT',
        statusCode: 200,
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        description: '更新用户信息',
      })

      const found = await auditLogService.findOne(created.id)

      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.action).toBe('update')
      expect(found!.entity).toBe('User')
      expect(found!.entityId).toBe('user-456')
      expect(found!.operatorId).toBe('admin')
      expect(found!.operatorName).toBe('管理员')
      expect(found!.path).toBe('/users/user-456')
      expect(found!.method).toBe('PUT')
      expect(found!.statusCode).toBe(200)
      expect(found!.ip).toBe('127.0.0.1')
      expect(found!.userAgent).toBe('Mozilla/5.0')
      expect(found!.description).toBe('更新用户信息')
    })

    it('should return null when audit log does not exist', async () => {
      const found = await auditLogService.findOne('00000000-0000-0000-0000-000000000999')
      expect(found).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('should create an audit log with all fields', async () => {
      const log = await auditLogService.create({
        action: 'create',
        entity: 'Role',
        entityId: 'role-789',
        operatorId: 'admin',
        operatorName: '管理员',
        path: '/roles',
        method: 'POST',
        requestBody: { name: '新角色', code: 'new-role' },
        statusCode: 201,
        responseBody: { id: 'role-789', name: '新角色' },
        ip: '192.168.1.1',
        userAgent: 'PostmanRuntime/7.28.0',
        error: null,
        description: '创建新角色',
      })

      expect(log).not.toBeNull()
      expect(log.id).toBeDefined()
      expect(log.action).toBe('create')
      expect(log.entity).toBe('Role')
      expect(log.entityId).toBe('role-789')
      expect(log.operatorId).toBe('admin')
      expect(log.operatorName).toBe('管理员')
      expect(log.path).toBe('/roles')
      expect(log.method).toBe('POST')
      expect(log.requestBody).toEqual({ name: '新角色', code: 'new-role' })
      expect(log.statusCode).toBe(201)
      expect(log.responseBody).toEqual({ id: 'role-789', name: '新角色' })
      expect(log.ip).toBe('192.168.1.1')
      expect(log.userAgent).toBe('PostmanRuntime/7.28.0')
      expect(log.error).toBeNull()
      expect(log.description).toBe('创建新角色')
      expect(log.createdAt).toBeDefined()
    })

    it('should create an audit log with minimal fields', async () => {
      const log = await auditLogService.create({
        action: 'login',
        entity: 'Auth',
        operatorId: 'guest',
        operatorName: '访客',
        path: '/auth/login',
        method: 'POST',
        statusCode: 200,
      })

      expect(log).not.toBeNull()
      expect(log.id).toBeDefined()
      expect(log.action).toBe('login')
      expect(log.entity).toBe('Auth')
      expect(log.entityId).toBeNull()
      expect(log.operatorId).toBe('guest')
      expect(log.operatorName).toBe('访客')
      expect(log.path).toBe('/auth/login')
      expect(log.method).toBe('POST')
      expect(log.requestBody).toBeNull()
      expect(log.statusCode).toBe(200)
      expect(log.responseBody).toBeNull()
      expect(log.ip).toBeNull()
      expect(log.userAgent).toBeNull()
      expect(log.error).toBeNull()
      expect(log.description).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // delete — soft delete
  // -------------------------------------------------------------------------

  describe('delete', () => {
    it('should soft-delete an existing audit log', async () => {
      const created = await auditLogService.create({
        action: 'delete',
        entity: 'User',
        operatorId: 'admin',
        operatorName: '管理员',
        path: '/users/1',
        method: 'DELETE',
        statusCode: 200,
      })

      const result = await auditLogService.delete(created.id)
      expect(result).toBe(true)

      // Verify deletedAt is set via direct DB query
      const em = getOrm().em.fork()
      const log = await em.findOne(AuditLog, { id: created.id })
      expect(log).not.toBeNull()
      expect(log!.deletedAt).not.toBeNull()
    })

    it('should return false when deleting non-existent audit log', async () => {
      const result = await auditLogService.delete('00000000-0000-0000-0000-000000000999')
      expect(result).toBe(false)
    })
  })
})
