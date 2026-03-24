import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { DataPermissionService } from '../base/guards/data-permission.service'
import { createTestOrm, closeTestOrm } from './helpers/test-db'
import { RoleService } from '../core/role/role.service'

describe('DataPermissionService', () => {
  let dataPermissionService: DataPermissionService
  let roleService: RoleService
  let adminRoleId: string
  let userRoleId: string

  beforeAll(async () => {
    await createTestOrm()
  })

  beforeEach(async () => {
    dataPermissionService = new DataPermissionService()
    roleService = new RoleService()

    // Get role IDs from seeded data
    const adminRole = await roleService.findByCode('admin')
    const userRole = await roleService.findByCode('user')
    adminRoleId = adminRole!.id
    userRoleId = userRole!.id
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  // ========================================================================
  // generateFilter() tests
  // ========================================================================

  describe('generateFilter()', () => {
    it('should return full access for admin role', async () => {
      const result = await dataPermissionService.generateFilter(['admin'], 'user')

      expect(result.hasFullAccess).toBe(true)
      expect(result.filter).toEqual({})
    })

    it('should return empty filter when no rules exist for non-admin role', async () => {
      const result = await dataPermissionService.generateFilter(['user'], 'user')

      expect(result.hasFullAccess).toBe(false)
      expect(result.filter).toEqual({})
    })

    it('should return empty filter when role has no matching rules', async () => {
      // Create a new role without any rules
      const customRole = await roleService.create({
        name: 'CustomRole',
        code: 'custom_role',
      })

      const result = await dataPermissionService.generateFilter(['custom_role'], 'user')

      expect(result.hasFullAccess).toBe(false)
      expect(result.filter).toEqual({})

      // Cleanup
      await roleService.delete(customRole!.id)
    })
  })

  // ========================================================================
  // Filter operators tests — each test uses unique resource type to isolate
  // ========================================================================

  describe('Filter operators', () => {
    it('should generate eq (equals) filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_eq',
        filterField: 'departmentId',
        filterOperator: 'eq',
        filterValue: 'dept-001',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_eq')

      expect(result.hasFullAccess).toBe(false)
      expect(result.filter).toEqual({
        $or: [{ departmentId: 'dept-001' }],
      })
    })

    it('should generate neq (not equals) filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_neq',
        filterField: 'status',
        filterOperator: 'neq',
        filterValue: 'inactive',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_neq')

      expect(result.filter).toEqual({
        $or: [{ status: { $ne: 'inactive' } }],
      })
    })

    it('should generate in filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_in',
        filterField: 'roleIds',
        filterOperator: 'in',
        filterValue: ['admin', 'manager'],
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_in')

      expect(result.filter).toEqual({
        $or: [{ roleIds: { $in: ['admin', 'manager'] } }],
      })
    })

    it('should generate nin (not in) filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_nin',
        filterField: 'groupId',
        filterOperator: 'nin',
        filterValue: ['group-001', 'group-002'],
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_nin')

      expect(result.filter).toEqual({
        $or: [{ groupId: { $nin: ['group-001', 'group-002'] } }],
      })
    })

    it('should generate like filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_like',
        filterField: 'email',
        filterOperator: 'like',
        filterValue: '%@example.com',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_like')

      expect(result.filter).toEqual({
        $or: [{ email: { $like: '%@example.com' } }],
      })
    })

    it('should generate gt filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_gt',
        filterField: 'age',
        filterOperator: 'gt',
        filterValue: '18',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_gt')

      expect(result.filter).toEqual({
        $or: [{ age: { $gt: '18' } }],
      })
    })

    it('should generate gte filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_gte',
        filterField: 'score',
        filterOperator: 'gte',
        filterValue: '60',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_gte')

      expect(result.filter).toEqual({
        $or: [{ score: { $gte: '60' } }],
      })
    })

    it('should generate lt filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_lt',
        filterField: 'priority',
        filterOperator: 'lt',
        filterValue: '5',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_lt')

      expect(result.filter).toEqual({
        $or: [{ priority: { $lt: '5' } }],
      })
    })

    it('should generate lte filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_lte',
        filterField: 'level',
        filterOperator: 'lte',
        filterValue: '10',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_lte')

      expect(result.filter).toEqual({
        $or: [{ level: { $lte: '10' } }],
      })
    })

    it('should generate isnull filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_isnull',
        filterField: 'deletedAt',
        filterOperator: 'isnull',
        filterValue: '',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_isnull')

      expect(result.filter).toEqual({
        $or: [{ deletedAt: null }],
      })
    })

    it('should generate isnotnull filter', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_isnotnull',
        filterField: 'activatedAt',
        filterOperator: 'isnotnull',
        filterValue: '',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_isnotnull')

      expect(result.filter).toEqual({
        $or: [{ activatedAt: { $ne: null } }],
      })
    })

    it('should handle $userId placeholder for own records', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'resource_userid',
        filterField: 'ownerId',
        filterOperator: 'eq',
        filterValue: '$userId',
      })

      const result = await dataPermissionService.generateFilter(['user'], 'resource_userid', 'user-123')

      expect(result.filter).toEqual({
        $or: [{ ownerId: 'user-123' }],
      })
    })
  })

  // ========================================================================
  // getRulesForRoles() tests
  // ========================================================================

  describe('getRulesForRoles()', () => {
    it('should return empty array when no rules exist', async () => {
      const rules = await dataPermissionService.getRulesForRoles(['user'], 'nonexistent')

      expect(rules).toEqual([])
    })

    it('should return rules for given roles and resource type', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'order_rule',
        filterField: 'departmentId',
        filterOperator: 'eq',
        filterValue: 'dept-001',
      })

      const rules = await dataPermissionService.getRulesForRoles(['user'], 'order_rule')

      expect(rules.length).toBe(1)
      expect(rules[0].filterField).toBe('departmentId')
      expect(rules[0].filterOperator).toBe('eq')
    })

    it('should not return rules for different resource type', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'order_diff',
        filterField: 'departmentId',
        filterOperator: 'eq',
        filterValue: 'dept-001',
      })

      const rules = await dataPermissionService.getRulesForRoles(['user'], 'user')

      expect(rules).toEqual([])
    })
  })

  // ========================================================================
  // createRule() tests
  // ========================================================================

  describe('createRule()', () => {
    it('should create a data permission rule', async () => {
      const rule = await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'product_create',
        filterField: 'categoryId',
        filterOperator: 'eq',
        filterValue: 'cat-001',
        priority: 5,
        allow: true,
      })

      expect(rule).not.toBeNull()
      expect(rule.resourceType).toBe('product_create')
      expect(rule.filterField).toBe('categoryId')
      expect(rule.filterOperator).toBe('eq')
      expect(rule.filterValue).toBe('cat-001')
      expect(rule.priority).toBe(5)
      expect(rule.allow).toBe(true)
    })

    it('should create rule with array filter value', async () => {
      const rule = await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'product_array',
        filterField: 'categoryIds',
        filterOperator: 'in',
        filterValue: ['cat-001', 'cat-002', 'cat-003'],
      })

      expect(rule).not.toBeNull()
      expect(rule.filterField).toBe('categoryIds')
      expect(rule.filterOperator).toBe('in')
      // filterValue is stored as JSON stringified
      expect(rule.filterValue).toBe('["cat-001","cat-002","cat-003"]')
    })

    it('should use default priority and allow values', async () => {
      const rule = await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'product_default',
        filterField: 'status',
        filterOperator: 'eq',
        filterValue: 'active',
      })

      expect(rule.priority).toBe(0)
      expect(rule.allow).toBe(true)
    })
  })

  // ========================================================================
  // deleteRule() tests
  // ========================================================================

  describe('deleteRule()', () => {
    it('should soft-delete an existing rule', async () => {
      const rule = await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'temp_resource',
        filterField: 'tempField',
        filterOperator: 'eq',
        filterValue: 'tempValue',
      })

      const result = await dataPermissionService.deleteRule(rule.id)

      expect(result).toBe(true)

      // Rule should no longer be returned by getRulesForRoles
      const rules = await dataPermissionService.getRulesForRoles(['user'], 'temp_resource')
      expect(rules.length).toBe(0)
    })

    it('should return false when deleting non-existent rule', async () => {
      const result = await dataPermissionService.deleteRule('00000000-0000-0000-0000-000000000999')

      expect(result).toBe(false)
    })
  })

  // ========================================================================
  // findByResourceType() tests
  // ========================================================================

  describe('findByResourceType()', () => {
    it('should return all rules for a resource type', async () => {
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'inventory_find',
        filterField: 'warehouseId',
        filterOperator: 'eq',
        filterValue: 'wh-001',
      })

      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'inventory_find',
        filterField: 'stockLevel',
        filterOperator: 'gt',
        filterValue: '0',
      })

      const rules = await dataPermissionService.findByResourceType('inventory_find')

      expect(rules.length).toBe(2)
    })

    it('should return empty array for non-existent resource type', async () => {
      const rules = await dataPermissionService.findByResourceType('nonexistent')

      expect(rules).toEqual([])
    })
  })

  // ========================================================================
  // Integration: Admin vs Regular role
  // ========================================================================

  describe('Admin vs Regular role access', () => {
    it('should grant full access to admin role when no rules exist', async () => {
      // Admin role should ignore all rules
      const adminResult = await dataPermissionService.generateFilter(['admin'], 'document_admin_test')
      expect(adminResult.hasFullAccess).toBe(true)
      expect(adminResult.filter).toEqual({})
    })

    it('should apply rules for regular user role', async () => {
      // Create rule for user role
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'document_user_test',
        filterField: 'departmentId',
        filterOperator: 'eq',
        filterValue: 'dept-user',
      })

      const userResult = await dataPermissionService.generateFilter(['user'], 'document_user_test')
      expect(userResult.hasFullAccess).toBe(false)
      expect(userResult.filter).toEqual({
        $or: [{ departmentId: 'dept-user' }],
      })
    })

    it('should handle multiple roles including admin', async () => {
      // Create rule for user role
      await dataPermissionService.createRule({
        roleId: userRoleId,
        resourceType: 'document_multi_test',
        filterField: 'departmentId',
        filterOperator: 'eq',
        filterValue: 'dept-user',
      })

      // User with both regular role and admin should get full access
      const multiRoleResult = await dataPermissionService.generateFilter(['user', 'admin'], 'document_multi_test')
      expect(multiRoleResult.hasFullAccess).toBe(true)
    })
  })
})
