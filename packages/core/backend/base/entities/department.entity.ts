import { Entity, Filter, PrimaryKey, Property, ManyToOne, OneToMany } from '@mikro-orm/core'

/**
 * 部门实体
 * 支持树形结构（自关联）
 */
@Filter({ name: 'soft-delete', cond: { deletedAt: null } })
@Entity()
export class Department {
  @PrimaryKey()
  id!: string

  /** 部门名称 */
  @Property()
  name!: string

  /** 部门编码 */
  @Property()
  code!: string

  /** 父部门 ID */
  @Property({ nullable: true })
  parentId!: string | null

  /** 排序号 */
  @Property()
  sort!: number

  /** 负责人 */
  @Property({ nullable: true })
  leader!: string | null

  /** 联系电话 */
  @Property({ nullable: true })
  phone!: string | null

  /** 邮箱 */
  @Property({ nullable: true })
  email!: string | null

  /** 部门状态 */
  @Property()
  enabled!: boolean

  @Property({ fieldName: 'created_at', defaultRaw: 'NOW()' })
  createdAt!: Date

  @Property({ fieldName: 'updated_at', defaultRaw: 'NOW()', onUpdate: () => 'NOW()' })
  updatedAt!: Date

  @Property({ fieldName: 'deleted_at', nullable: true })
  deletedAt!: Date | null
}

// ============================================================================
// Backward-compatible types
// ============================================================================

export interface DepartmentRow {
  id: string
  name: string
  code: string
  parentId: string | null
  sort: number
  leader: string | null
  phone: string | null
  email: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 部门树节点
 */
export interface DepartmentTreeNode extends DepartmentRow {
  children: DepartmentTreeNode[]
}

export function rowToDepartment(row: DepartmentRow) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    parentId: row.parentId,
    sort: row.sort,
    leader: row.leader,
    phone: row.phone,
    email: row.email,
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function buildTree(departments: DepartmentRow[]): DepartmentTreeNode[] {
  const map = new Map<string, DepartmentTreeNode>()
  const roots: DepartmentTreeNode[] = []

  // 第一次遍历：创建所有节点
  for (const dept of departments) {
    map.set(dept.id, { ...dept, enabled: Boolean(dept.enabled), children: [] })
  }

  // 第二次遍历：建立父子关系
  for (const dept of departments) {
    const node = map.get(dept.id)!
    if (dept.parentId && map.has(dept.parentId)) {
      map.get(dept.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // 按 sort 排序
  const sortChildren = (nodes: DepartmentTreeNode[]) => {
    nodes.sort((a, b) => a.sort - b.sort)
    nodes.forEach(n => sortChildren(n.children))
  }
  sortChildren(roots)

  return roots
}
