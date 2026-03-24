import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { MenuPermissionService } from '../core/menu-permission/menu-permission.service'
import { AppService } from '../core/shared/app.service'
import { RoleService } from '../core/role/role.service'
import { createTestOrm, closeTestOrm } from './helpers/test-db'

describe('MenuPermissionService — CRUD (PostgreSQL)', () => {
  let menuPermissionService: MenuPermissionService
  let roleService: RoleService

  // Admin role ID from seed data
  const adminRoleId = 'a0000000-0000-0000-0000-000000000001'
  // Regular user role ID from seed data
  const userRoleId = 'a0000000-0000-0000-0000-000000000002'

  beforeAll(async () => {
    await createTestOrm()
  })

  beforeEach(async () => {
    menuPermissionService = new MenuPermissionService()
    roleService = new RoleService()
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  // =============================================================================
  // MenuPermissionService.create()
  // =============================================================================
  describe('create', () => {
    it('should create a new menu permission', async () => {
      const perm = await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/dashboard',
        action: 'read',
      })

      expect(perm).not.toBeNull()
      expect(perm.roleId).toBe(userRoleId)
      expect(perm.menuPath).toBe('/dashboard')
      expect(perm.action).toBe('read')
      expect(perm.id).toBeDefined()
    })

    it('should create multiple menu permissions for same role', async () => {
      const perm1 = await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/system/user',
        action: 'read',
      })
      const perm2 = await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/system/role',
        action: 'read',
      })

      expect(perm1.id).not.toBe(perm2.id)
      expect(perm1.menuPath).not.toBe(perm2.menuPath)
    })
  })

  // =============================================================================
  // MenuPermissionService.findByRoleId()
  // =============================================================================
  describe('findByRoleId', () => {
    it('should find menu permissions by role ID', async () => {
      // Create a permission first
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/test/path',
        action: 'read',
      })

      const perms = await menuPermissionService.findByRoleId(userRoleId)
      expect(perms.length).toBeGreaterThanOrEqual(1)
      expect(perms.some(p => p.menuPath === '/test/path')).toBe(true)
    })

    it('should return empty array for role with no permissions', async () => {
      // Create a new role without permissions
      const newRole = await roleService.create({
        name: 'NoPermRole',
        code: 'no_perm_role',
      })

      const perms = await menuPermissionService.findByRoleId(newRole!.id)
      expect(perms).toEqual([])
    })
  })

  // =============================================================================
  // MenuPermissionService.findByRoleIds()
  // =============================================================================
  describe('findByRoleIds', () => {
    it('should find menu permissions by multiple role IDs', async () => {
      await menuPermissionService.create({
        roleId: adminRoleId,
        menuPath: '/admin/path',
        action: 'read',
      })

      const perms = await menuPermissionService.findByRoleIds([adminRoleId, userRoleId])
      expect(perms.length).toBeGreaterThanOrEqual(1)
    })

    it('should return empty array for empty role IDs', async () => {
      const perms = await menuPermissionService.findByRoleIds([])
      expect(perms).toEqual([])
    })
  })

  // =============================================================================
  // MenuPermissionService.hasMenuPermission()
  // =============================================================================
  describe('hasMenuPermission', () => {
    it('should return true for admin role on any path', async () => {
      const result = await menuPermissionService.hasMenuPermission([adminRoleId], '/any/path')
      expect(result).toBe(true)
    })

    it('should return true when role has matching menu permission', async () => {
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/system/user',
        action: 'read',
      })

      const result = await menuPermissionService.hasMenuPermission([userRoleId], '/system/user')
      expect(result).toBe(true)
    })

    it('should return true for child path of permitted parent', async () => {
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/system',
        action: 'read',
      })

      const result = await menuPermissionService.hasMenuPermission([userRoleId], '/system/user/list')
      expect(result).toBe(true)
    })

    it('should return false when role has no permission for path', async () => {
      const result = await menuPermissionService.hasMenuPermission([userRoleId], '/some/unknown/path')
      expect(result).toBe(false)
    })

    it('should return false for empty role IDs', async () => {
      const result = await menuPermissionService.hasMenuPermission([], '/any/path')
      expect(result).toBe(false)
    })

    it('should return true if any of multiple roles has permission', async () => {
      // userRoleId has no menu permissions yet (only role permission 'user:list')
      const newRole = await roleService.create({
        name: 'Editor',
        code: 'editor',
      })

      await menuPermissionService.create({
        roleId: newRole!.id,
        menuPath: '/order',
        action: 'read',
      })

      // adminRoleId has '*' permission, should return true
      const result = await menuPermissionService.hasMenuPermission([userRoleId, adminRoleId], '/any/path')
      expect(result).toBe(true)
    })

    it('should return false for non-existent role', async () => {
      const result = await menuPermissionService.hasMenuPermission(
        ['00000000-0000-0000-0000-000000000999'],
        '/any/path'
      )
      expect(result).toBe(false)
    })
  })

  // =============================================================================
  // MenuPermissionService.getPermittedPaths()
  // =============================================================================
  describe('getPermittedPaths', () => {
    it('should return empty array for admin (means all paths)', async () => {
      const paths = await menuPermissionService.getPermittedPaths([adminRoleId])
      expect(paths).toEqual([]) // Empty means all paths
    })

    it('should return specific paths for non-admin role', async () => {
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/dashboard',
        action: 'read',
      })
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/system/user',
        action: 'read',
      })

      const paths = await menuPermissionService.getPermittedPaths([userRoleId])
      expect(paths).toContain('/dashboard')
      expect(paths).toContain('/system/user')
    })

    it('should return deduplicated paths', async () => {
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/dashboard',
        action: 'read',
      })
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/dashboard',
        action: 'write',
      })

      const paths = await menuPermissionService.getPermittedPaths([userRoleId])
      const dashboardCount = paths.filter(p => p === '/dashboard').length
      expect(dashboardCount).toBe(1)
    })

    it('should return empty array for empty role IDs', async () => {
      const paths = await menuPermissionService.getPermittedPaths([])
      expect(paths).toEqual([])
    })
  })

  // =============================================================================
  // MenuPermissionService.deleteByRoleAndPath()
  // =============================================================================
  describe('deleteByRoleAndPath', () => {
    it('should soft-delete menu permission by role and path', async () => {
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/to/delete',
        action: 'read',
      })

      const result = await menuPermissionService.deleteByRoleAndPath(userRoleId, '/to/delete')
      expect(result.success).toBe(true)

      // Verify permission is no longer found
      const perms = await menuPermissionService.findByRoleId(userRoleId)
      expect(perms.some(p => p.menuPath === '/to/delete')).toBe(false)
    })

    it('should return success:false when permission does not exist', async () => {
      const result = await menuPermissionService.deleteByRoleAndPath(userRoleId, '/nonexistent/path')
      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // MenuPermissionService.deleteByRoleId()
  // =============================================================================
  describe('deleteByRoleId', () => {
    it('should soft-delete all menu permissions for a role', async () => {
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/role/perm/1',
        action: 'read',
      })
      await menuPermissionService.create({
        roleId: userRoleId,
        menuPath: '/role/perm/2',
        action: 'read',
      })

      const result = await menuPermissionService.deleteByRoleId(userRoleId)
      expect(result.success).toBe(true)

      const perms = await menuPermissionService.findByRoleId(userRoleId)
      expect(perms.length).toBe(0)
    })

    it('should return success:false when role has no permissions', async () => {
      const newRole = await roleService.create({
        name: 'AnotherNewRole',
        code: 'another_new_role',
      })

      const result = await menuPermissionService.deleteByRoleId(newRole!.id)
      expect(result.success).toBe(false)
    })
  })
})

describe('AppService — getMenuTreeByRoles (PostgreSQL)', () => {
  let appService: AppService
  let menuPermissionService: MenuPermissionService
  let roleService: RoleService

  const adminRoleId = 'a0000000-0000-0000-0000-000000000001'
  const userRoleId = 'a0000000-0000-0000-0000-000000000002'

  beforeAll(async () => {
    await createTestOrm()
  })

  beforeEach(async () => {
    appService = new AppService()
    menuPermissionService = new MenuPermissionService()
    roleService = new RoleService()
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  describe('getMenuTree', () => {
    it('should return full menu tree without filtering', () => {
      const menuTree = appService.getMenuTree()
      expect(menuTree.length).toBeGreaterThan(0)
      expect(menuTree.some(m => m.path === '/dashboard')).toBe(true)
      expect(menuTree.some(m => m.path === '/system')).toBe(true)
    })
  })

  describe('getMenuTreeByRoles', () => {
    it('should return empty array for empty role IDs', async () => {
      const result = await appService.getMenuTreeByRoles([])
      expect(result).toEqual([])
    })

    it('should return full menu tree for admin role', async () => {
      const result = await appService.getMenuTreeByRoles([adminRoleId])
      expect(result.length).toBeGreaterThan(0)
      expect(result.some(m => m.path === '/dashboard')).toBe(true)
      expect(result.some(m => m.path === '/system')).toBe(true)
    })

    it('should filter menu tree for regular role based on permissions', async () => {
      // Create a new role with limited permissions
      const limitedRole = await roleService.create({
        name: 'LimitedUser',
        code: 'limited_user',
        permissions: ['user:list', 'order:list'], // Only user:list and order:list
      })

      const result = await appService.getMenuTreeByRoles([limitedRole!.id])

      // Should have dashboard (no permission required)
      expect(result.some(m => m.path === '/dashboard')).toBe(true)

      // Should have /system/user because user:list permission
      const systemMenu = result.find(m => m.path === '/system')
      expect(systemMenu).toBeDefined()
      expect(systemMenu?.children?.some(c => c.path === '/system/user')).toBe(true)

      // Should NOT have /system/role because no role:list permission
      expect(systemMenu?.children?.some(c => c.path === '/system/role')).toBe(false)

      // Should have /order/list because order:list permission
      expect(result.some(m => m.path === '/order')).toBe(true)
    })

    it('should include parent menu if it has no permission requirement', async () => {
      const newRole = await roleService.create({
        name: 'NoPermNewRole',
        code: 'no_perm_new_role',
        permissions: [], // No permissions
      })

      const result = await appService.getMenuTreeByRoles([newRole!.id])

      // Dashboard has no permission requirement, should be included
      expect(result.some(m => m.path === '/dashboard')).toBe(true)
    })

    it('should include parent menu without permission requirement even when all children are filtered', async () => {
      const newRole = await roleService.create({
        name: 'OnlyOrderRole',
        code: 'only_order_role',
        permissions: ['order:list'],
      })

      const result = await appService.getMenuTreeByRoles([newRole!.id])

      // /system has no permission requirement itself, so it's included even if all children are filtered
      // But its children should NOT be included since user lacks those permissions
      expect(result.some(m => m.path === '/system')).toBe(true)
      const systemMenu = result.find(m => m.path === '/system')
      expect(systemMenu?.children?.length).toBe(0)

      // /order should be included with its child since user has order:list permission
      expect(result.some(m => m.path === '/order')).toBe(true)
    })

    it('should return full tree if any role is admin', async () => {
      const result = await appService.getMenuTreeByRoles([userRoleId, adminRoleId])
      expect(result.length).toBeGreaterThan(0)
      // Should have both dashboard and system (full tree)
      expect(result.some(m => m.path === '/dashboard')).toBe(true)
      expect(result.some(m => m.path === '/system')).toBe(true)
    })
  })
})
