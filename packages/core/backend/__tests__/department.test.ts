import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { DepartmentService } from '../core/department/department.service'
import { createTestOrm, closeTestOrm } from './helpers/test-db'
import { BadRequestException, NotFoundException } from '@nestjs/common'

describe('DepartmentService — CRUD (PostgreSQL)', () => {
  let departmentService: DepartmentService

  beforeAll(async () => {
    await createTestOrm()
  })

  beforeEach(async () => {
    departmentService = new DepartmentService()
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  // =============================================================================
  // DepartmentService.findAll()
  // =============================================================================
  describe('findAll', () => {
    it('should return all non-deleted departments sorted by sort', async () => {
      // Create test departments with different sort orders
      const dept1 = await departmentService.create({
        name: '技术部',
        code: 'tech',
        sort: 2,
      })
      const dept2 = await departmentService.create({
        name: '市场部',
        code: 'market',
        sort: 1,
      })
      const dept3 = await departmentService.create({
        name: '财务部',
        code: 'finance',
        sort: 3,
      })

      const result = await departmentService.findAll()

      expect(result.length).toBeGreaterThanOrEqual(3)
      // Should be sorted by sort ASC
      const sortValues = result.map(d => d.sort)
      expect(sortValues).toEqual([...sortValues].sort((a, b) => a - b))
    })

    it('should not include soft-deleted departments', async () => {
      const dept = await departmentService.create({
        name: '待删除部门',
        code: 'to_delete',
      })

      await departmentService.delete(dept.id)

      const result = await departmentService.findAll()
      expect(result.some(d => d.code === 'to_delete')).toBe(false)
    })
  })

  // =============================================================================
  // DepartmentService.findTree()
  // =============================================================================
  describe('findTree', () => {
    it('should return tree structure', async () => {
      // Create parent department
      const parent = await departmentService.create({
        name: '总公司',
        code: 'headquarter',
        sort: 1,
      })

      // Create child departments
      await departmentService.create({
        name: '研发中心',
        code: 'rd',
        parentId: parent.id,
        sort: 1,
      })
      await departmentService.create({
        name: '运营中心',
        code: 'ops',
        parentId: parent.id,
        sort: 2,
      })

      const tree = await departmentService.findTree()

      expect(Array.isArray(tree)).toBe(true)
      // Should have at least the headquarter node
      const hqNode = tree.find((n: any) => n.code === 'headquarter')
      expect(hqNode).toBeDefined()
      expect(hqNode.children).toBeDefined()
      expect(hqNode.children.length).toBe(2)
    })
  })

  // =============================================================================
  // DepartmentService.findOne()
  // =============================================================================
  describe('findOne', () => {
    it('should return department info for existing department', async () => {
      const created = await departmentService.create({
        name: '测试部门',
        code: 'test_find_one',
      })

      const result = await departmentService.findOne(created.id)

      expect(result).not.toBeNull()
      expect(result!.id).toBe(created.id)
      expect(result!.name).toBe('测试部门')
      expect(result!.code).toBe('test_find_one')
    })

    it('should return null for non-existent department', async () => {
      const result = await departmentService.findOne('00000000-0000-0000-0000-000000000999')
      expect(result).toBeNull()
    })
  })

  // =============================================================================
  // DepartmentService.findByCode()
  // =============================================================================
  describe('findByCode', () => {
    it('should return department info for existing code', async () => {
      await departmentService.create({
        name: '按编码查询部门',
        code: 'unique_code_123',
      })

      const result = await departmentService.findByCode('unique_code_123')

      expect(result).not.toBeNull()
      expect(result!.code).toBe('unique_code_123')
      expect(result!.name).toBe('按编码查询部门')
    })

    it('should return null for non-existent code', async () => {
      const result = await departmentService.findByCode('non_existent_code_xyz')
      expect(result).toBeNull()
    })
  })

  // =============================================================================
  // DepartmentService.findByParentId()
  // =============================================================================
  describe('findByParentId', () => {
    it('should return child departments sorted by sort', async () => {
      const parent = await departmentService.create({
        name: '父部门',
        code: 'parent_dept',
      })

      await departmentService.create({
        name: '子部门B',
        code: 'child_b',
        parentId: parent.id,
        sort: 2,
      })
      await departmentService.create({
        name: '子部门A',
        code: 'child_a',
        parentId: parent.id,
        sort: 1,
      })

      const children = await departmentService.findByParentId(parent.id)

      expect(children.length).toBe(2)
      // Should be sorted by sort ASC
      expect(children[0].code).toBe('child_a')
      expect(children[1].code).toBe('child_b')
    })

    it('should return empty array when no children', async () => {
      const dept = await departmentService.create({
        name: '无子部门',
        code: 'no_children',
      })

      const children = await departmentService.findByParentId(dept.id)
      expect(children).toEqual([])
    })
  })

  // =============================================================================
  // DepartmentService.create()
  // =============================================================================
  describe('create', () => {
    it('should create a department normally', async () => {
      const result = await departmentService.create({
        name: '新建部门',
        code: 'new_dept',
        sort: 10,
        leader: '张三',
        phone: '13800138000',
        email: 'zhangsan@example.com',
      })

      expect(result).not.toBeNull()
      expect(result.name).toBe('新建部门')
      expect(result.code).toBe('new_dept')
      expect(result.sort).toBe(10)
      expect(result.leader).toBe('张三')
      expect(result.phone).toBe('13800138000')
      expect(result.email).toBe('zhangsan@example.com')
      expect(result.enabled).toBe(true)
      expect(result.id).toBeDefined()
    })

    it('should throw BadRequestException for duplicate code', async () => {
      await departmentService.create({
        name: '部门A',
        code: 'duplicate_code',
      })

      await expect(
        departmentService.create({
          name: '部门B',
          code: 'duplicate_code',
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw NotFoundException when parent department does not exist', async () => {
      await expect(
        departmentService.create({
          name: '子部门',
          code: 'child_dept',
          parentId: '00000000-0000-0000-0000-000000000999',
        })
      ).rejects.toThrow(NotFoundException)
    })

    it('should create root department when parentId is null', async () => {
      const result = await departmentService.create({
        name: '顶级部门',
        code: 'root_dept',
        parentId: null,
      })

      expect(result).not.toBeNull()
      expect(result.parentId).toBeNull()
    })
  })

  // =============================================================================
  // DepartmentService.update()
  // =============================================================================
  describe('update', () => {
    it('should update a department normally', async () => {
      const dept = await departmentService.create({
        name: '待更新部门',
        code: 'to_update',
      })

      const result = await departmentService.update(dept.id, {
        name: '已更新部门',
        sort: 99,
        leader: '李四',
      })

      expect(result).not.toBeNull()
      expect(result!.name).toBe('已更新部门')
      expect(result!.sort).toBe(99)
      expect(result!.leader).toBe('李四')
      expect(result!.code).toBe('to_update') // code unchanged
    })

    it('should throw BadRequestException for duplicate code', async () => {
      await departmentService.create({
        name: '部门X',
        code: 'dept_x',
      })
      const deptY = await departmentService.create({
        name: '部门Y',
        code: 'dept_y',
      })

      await expect(
        departmentService.update(deptY.id, { code: 'dept_x' })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when setting self as parent', async () => {
      const dept = await departmentService.create({
        name: '循环引用部门',
        code: 'circular_dept',
      })

      await expect(
        departmentService.update(dept.id, { parentId: dept.id })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when setting descendant as parent', async () => {
      // Create parent -> child hierarchy
      const parent = await departmentService.create({
        name: '祖父部门',
        code: 'grandparent',
      })
      const child = await departmentService.create({
        name: '子部门',
        code: 'child',
        parentId: parent.id,
      })
      const grandchild = await departmentService.create({
        name: '孙部门',
        code: 'grandchild',
        parentId: child.id,
      })

      // Try to set grandchild's parent to grandchild itself via parent (grandparent -> grandchild)
      // This means: grandparent should not be able to set its parent to grandchild
      await expect(
        departmentService.update(parent.id, { parentId: grandchild.id })
      ).rejects.toThrow(BadRequestException)
    })

    it('should return null when updating non-existent department', async () => {
      const result = await departmentService.update('00000000-0000-0000-0000-000000000999', {
        name: '新名字',
      })
      expect(result).toBeNull()
    })
  })

  // =============================================================================
  // DepartmentService.delete()
  // =============================================================================
  describe('delete', () => {
    it('should delete department without children successfully', async () => {
      const dept = await departmentService.create({
        name: '待删除无子部门',
        code: 'delete_no_children',
      })

      const result = await departmentService.delete(dept.id)

      expect(result).toBe(true)

      // Verify department is soft-deleted by checking findAll (which uses soft-delete filter)
      const allDepts = await departmentService.findAll()
      expect(allDepts.some(d => d.code === 'delete_no_children')).toBe(false)
    })

    it('should throw BadRequestException when deleting department with children', async () => {
      const parent = await departmentService.create({
        name: '有子部门的父部门',
        code: 'parent_with_children',
      })
      await departmentService.create({
        name: '子部门',
        code: 'has_parent',
        parentId: parent.id,
      })

      await expect(departmentService.delete(parent.id)).rejects.toThrow(BadRequestException)
    })

    it('should return false when deleting non-existent department', async () => {
      const result = await departmentService.delete('00000000-0000-0000-0000-000000000999')
      expect(result).toBe(false)
    })
  })

  // =============================================================================
  // DepartmentService.getDescendantIds()
  // =============================================================================
  describe('getDescendantIds', () => {
    it('should return all descendant IDs correctly', async () => {
      // Create a hierarchy: root -> child1 -> grandchild1
      //                      -> child2 -> grandchild2
      const root = await departmentService.create({
        name: '根部门',
        code: 'root',
        sort: 1,
      })
      const child1 = await departmentService.create({
        name: '子部门1',
        code: 'child1',
        parentId: root.id,
        sort: 1,
      })
      const child2 = await departmentService.create({
        name: '子部门2',
        code: 'child2',
        parentId: root.id,
        sort: 2,
      })
      const grandchild1 = await departmentService.create({
        name: '孙部门1',
        code: 'grandchild1',
        parentId: child1.id,
        sort: 1,
      })
      const grandchild2 = await departmentService.create({
        name: '孙部门2',
        code: 'grandchild2',
        parentId: child2.id,
        sort: 1,
      })

      const descendants = await departmentService.getDescendantIds(root.id)

      expect(descendants).toContain(child1.id)
      expect(descendants).toContain(child2.id)
      expect(descendants).toContain(grandchild1.id)
      expect(descendants).toContain(grandchild2.id)
      expect(descendants.length).toBe(4)
    })

    it('should return empty array for department without children', async () => {
      const dept = await departmentService.create({
        name: '无后代部门',
        code: 'no_descendants',
      })

      const descendants = await departmentService.getDescendantIds(dept.id)
      expect(descendants).toEqual([])
    })
  })
})