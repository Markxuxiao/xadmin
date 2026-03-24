import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { MenuService } from '../core/menu/menu.service'
import { createTestOrm, closeTestOrm } from './helpers/test-db'

describe('MenuService — CRUD (PostgreSQL)', () => {
  let menuService: MenuService

  beforeAll(async () => {
    await createTestOrm()
  })

  beforeEach(async () => {
    menuService = new MenuService()
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  // =============================================================================
  // MenuService.getMenuTree()
  // =============================================================================
  describe('getMenuTree', () => {
    it('should return menu tree structure', async () => {
      const menuTree = await menuService.getMenuTree()
      expect(menuTree).toBeDefined()
      expect(Array.isArray(menuTree)).toBe(true)
    })

    it('should return menus sorted by sort field', async () => {
      const menuTree = await menuService.getMenuTree()
      if (menuTree.length > 1) {
        for (let i = 0; i < menuTree.length - 1; i++) {
          expect(menuTree[i].sort).toBeLessThanOrEqual(menuTree[i + 1].sort)
        }
      }
    })
  })

  // =============================================================================
  // MenuService.findById()
  // =============================================================================
  describe('findById', () => {
    it('should return menu info for existing menu', async () => {
      // First create a menu
      const created = await menuService.create({
        path: '/test/findbyid',
        title: 'Test FindById',
        sort: 0,
      })

      const result = await menuService.findById(created.id)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(created.id)
      expect(result?.path).toBe('/test/findbyid')
      expect(result?.title).toBe('Test FindById')
    })

    it('should return null for non-existent menu', async () => {
      const result = await menuService.findById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  // =============================================================================
  // MenuService.findAll()
  // =============================================================================
  describe('findAll', () => {
    it('should return all non-deleted menus as flat array', async () => {
      const menus = await menuService.findAll()
      expect(Array.isArray(menus)).toBe(true)
      menus.forEach(menu => {
        expect(menu.deletedAt).toBeNull()
      })
    })

    it('should return menus sorted by sort field', async () => {
      const menus = await menuService.findAll()
      if (menus.length > 1) {
        for (let i = 0; i < menus.length - 1; i++) {
          expect(menus[i].sort).toBeLessThanOrEqual(menus[i + 1].sort)
        }
      }
    })
  })

  // =============================================================================
  // MenuService.create()
  // =============================================================================
  describe('create', () => {
    it('should create a new menu normally', async () => {
      const menu = await menuService.create({
        path: '/test/create',
        title: 'Test Create',
        icon: 'TestIcon',
        sort: 100,
        permission: 'test:create',
        enabled: true,
      })

      expect(menu).toBeDefined()
      expect(menu.id).toBeDefined()
      expect(menu.path).toBe('/test/create')
      expect(menu.title).toBe('Test Create')
      expect(menu.icon).toBe('TestIcon')
      expect(menu.sort).toBe(100)
      expect(menu.permission).toBe('test:create')
      expect(menu.enabled).toBe(true)
      expect(menu.deletedAt).toBeNull()
    })

    it('should create menu with parent', async () => {
      // First create a parent menu
      const parent = await menuService.create({
        path: '/test/parent',
        title: 'Test Parent',
        sort: 0,
      })

      // Create child menu
      const child = await menuService.create({
        path: '/test/parent/child',
        title: 'Test Child',
        parentId: parent.id,
        sort: 0,
      })

      expect(child.parentId).toBe(parent.id)
      expect(child.id).not.toBe(parent.id)
    })

    it('should throw error when parent menu does not exist', async () => {
      await expect(
        menuService.create({
          path: '/test/orphan',
          title: 'Test Orphan',
          parentId: '00000000-0000-0000-0000-000000000000',
          sort: 0,
        })
      ).rejects.toThrow('Parent menu not found')
    })
  })

  // =============================================================================
  // MenuService.update()
  // =============================================================================
  describe('update', () => {
    it('should update menu info normally', async () => {
      const menu = await menuService.create({
        path: '/test/update',
        title: 'Original Title',
        sort: 0,
      })

      const updated = await menuService.update(menu.id, {
        title: 'Updated Title',
        icon: 'UpdatedIcon',
        sort: 50,
      })

      expect(updated.id).toBe(menu.id)
      expect(updated.title).toBe('Updated Title')
      expect(updated.icon).toBe('UpdatedIcon')
      expect(updated.sort).toBe(50)
    })

    it('should throw error when setting menu as its own parent (circular reference)', async () => {
      const menu = await menuService.create({
        path: '/test/circular',
        title: 'Test Circular',
        sort: 0,
      })

      await expect(
        menuService.update(menu.id, {
          parentId: menu.id,
        })
      ).rejects.toThrow('Cannot set menu as its own parent')
    })
  })

  // =============================================================================
  // MenuService.delete()
  // =============================================================================
  describe('delete', () => {
    it('should delete menu without children successfully', async () => {
      const menu = await menuService.create({
        path: '/test/delete',
        title: 'Test Delete',
        sort: 0,
      })

      await menuService.delete(menu.id)

      // Verify menu is soft-deleted
      const result = await menuService.findById(menu.id)
      expect(result).toBeNull()
    })

    it('should throw error when deleting menu with children', async () => {
      const parent = await menuService.create({
        path: '/test/parent-delete',
        title: 'Test Parent Delete',
        sort: 0,
      })

      // Create child menu
      await menuService.create({
        path: '/test/parent-delete/child',
        title: 'Test Child Delete',
        parentId: parent.id,
        sort: 0,
      })

      await expect(menuService.delete(parent.id)).rejects.toThrow('Cannot delete menu with children')
    })
  })

  // =============================================================================
  // MenuService.buildTree() (private, tested indirectly via getMenuTree)
  // =============================================================================
  describe('buildTree', () => {
    it('should correctly build parent-child relationships', async () => {
      // Create a parent and child
      const parent = await menuService.create({
        path: '/test/tree/parent',
        title: 'Tree Parent',
        sort: 1,
      })

      const child = await menuService.create({
        path: '/test/tree/parent/child1',
        title: 'Tree Child 1',
        parentId: parent.id,
        sort: 1,
      })

      await menuService.create({
        path: '/test/tree/parent/child2',
        title: 'Tree Child 2',
        parentId: parent.id,
        sort: 2,
      })

      const menuTree = await menuService.getMenuTree()

      // Find the parent in tree
      const treeParent = menuTree.find((m: any) => m.id === parent.id)
      expect(treeParent).toBeDefined()
      expect(treeParent.children).toBeDefined()
      expect(treeParent.children.length).toBe(2)
    })

    it('should identify root nodes correctly', async () => {
      // Create a standalone menu (no parent)
      const rootMenu = await menuService.create({
        path: '/test/tree/root',
        title: 'Tree Root',
        sort: 0,
      })

      const menuTree = await menuService.getMenuTree()

      // The root menu should be at the top level (no parentId)
      const foundRoot = menuTree.find((m: any) => m.id === rootMenu.id)
      expect(foundRoot).toBeDefined()
      expect(foundRoot.parentId).toBeNull()
    })
  })
})
