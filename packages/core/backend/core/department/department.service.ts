import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import * as crypto from 'crypto'
import { getOrm, Department, DepartmentRow, DepartmentTreeNode, buildTree } from '../../base'

@Injectable()
export class DepartmentService {
  /**
   * 获取所有部门（平铺）
   */
  async findAll() {
    const em = getOrm().em.fork()
    const depts = await em.find(Department, {}, {
      filter: ['soft-delete'],
      orderBy: { sort: 'ASC' },
    })
    return depts.map(d => this.deptToRow(d))
  }

  /**
   * 获取部门树
   */
  async findTree() {
    const depts = await this.findAll()
    return buildTree(depts as DepartmentRow[])
  }

  /**
   * 获取单个部门
   */
  async findOne(id: string) {
    const em = getOrm().em.fork()
    const dept = await em.findOne(Department, { id })
    return dept ? this.deptToRow(dept) : null
  }

  /**
   * 根据编码查找
   */
  async findByCode(code: string) {
    const em = getOrm().em.fork()
    const dept = await em.findOne(Department, { code })
    return dept ? this.deptToRow(dept) : null
  }

  /**
   * 根据父 ID 获取子部门
   */
  async findByParentId(parentId: string) {
    const em = getOrm().em.fork()
    const depts = await em.find(Department, { parentId }, {
      filter: ['soft-delete'],
      orderBy: { sort: 'ASC' },
    })
    return depts.map(d => this.deptToRow(d))
  }

  /**
   * 创建部门
   */
  async create(data: {
    name: string
    code: string
    parentId?: string | null
    sort?: number
    leader?: string
    phone?: string
    email?: string
  }) {
    const em = getOrm().em.fork()
    const now = new Date()

    // 检查编码唯一性
    const existing = await em.findOne(Department, { code: data.code })
    if (existing) {
      throw new BadRequestException('部门编码已存在')
    }

    // 验证父部门存在
    if (data.parentId) {
      const parent = await em.findOne(Department, { id: data.parentId })
      if (!parent) {
        throw new NotFoundException('父部门不存在')
      }
    }

    const dept = em.create(Department, {
      id: crypto.randomUUID(),
      name: data.name,
      code: data.code,
      parentId: data.parentId || null,
      sort: data.sort ?? 0,
      leader: data.leader || null,
      phone: data.phone || null,
      email: data.email || null,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    await em.persistAndFlush(dept)
    return this.deptToRow(dept)
  }

  /**
   * 更新部门
   */
  async update(id: string, data: Partial<{
    name: string
    code: string
    parentId: string | null
    sort: number
    leader: string
    phone: string
    email: string
    enabled: boolean
  }>) {
    const em = getOrm().em.fork()
    const dept = await em.findOne(Department, { id })
    if (!dept) return null

    // 检查编码唯一性（排除自己）
    if (data.code && data.code !== dept.code) {
      const existing = await em.findOne(Department, { code: data.code })
      if (existing) {
        throw new BadRequestException('部门编码已存在')
      }
    }

    // 检查循环引用：如果设置 parentId，不能是自己的后代
    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === id) {
        throw new BadRequestException('不能将自己设为父部门')
      }
      const isDescendant = await this.isDescendant(id, data.parentId)
      if (isDescendant) {
        throw new BadRequestException('不能将父部门设为自己的下级')
      }
    }

    if (data.name !== undefined) dept.name = data.name
    if (data.code !== undefined) dept.code = data.code
    if (data.parentId !== undefined) dept.parentId = data.parentId
    if (data.sort !== undefined) dept.sort = data.sort
    if (data.leader !== undefined) dept.leader = data.leader
    if (data.phone !== undefined) dept.phone = data.phone
    if (data.email !== undefined) dept.email = data.email
    if (data.enabled !== undefined) dept.enabled = data.enabled
    dept.updatedAt = new Date()

    await em.flush()
    return this.deptToRow(dept)
  }

  /**
   * 删除部门（软删除）
   * 如果有子部门，不能删除
   */
  async delete(id: string) {
    const em = getOrm().em.fork()

    // 检查是否有子部门
    const children = await em.find(Department, { parentId: id }, { filter: ['soft-delete'] })
    if (children.length > 0) {
      throw new BadRequestException('请先删除子部门')
    }

    const dept = await em.findOne(Department, { id })
    if (!dept) return false

    dept.deletedAt = new Date()
    await em.flush()
    return true
  }

  /**
   * 获取部门的所有后代 IDs
   */
  async getDescendantIds(id: string): Promise<string[]> {
    const allDepts = await this.findAll()
    const descendants: string[] = []

    const collectDescendants = (parentId: string) => {
      for (const dept of allDepts) {
        if (dept.parentId === parentId && !descendants.includes(dept.id)) {
          descendants.push(dept.id)
          collectDescendants(dept.id)
        }
      }
    }

    collectDescendants(id)
    return descendants
  }

  /**
   * 检查 targetId 是否是 sourceId 的后代
   */
  private async isDescendant(sourceId: string, targetId: string): Promise<boolean> {
    const descendants = await this.getDescendantIds(sourceId)
    return descendants.includes(targetId)
  }

  private deptToRow(dept: Department) {
    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      parentId: dept.parentId,
      sort: dept.sort,
      leader: dept.leader,
      phone: dept.phone,
      email: dept.email,
      enabled: Boolean(dept.enabled),
      createdAt: dept.createdAt instanceof Date ? dept.createdAt.toISOString() : String(dept.createdAt),
      updatedAt: dept.updatedAt instanceof Date ? dept.updatedAt.toISOString() : String(dept.updatedAt),
    }
  }
}
