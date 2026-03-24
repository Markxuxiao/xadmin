import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { DataPermission, DataPermissionRow, FilterOperator, DataScopeResult } from '../entities/data-permission.entity'
import { getOrm } from '../database'
import { Role } from '../entities/role.entity'

@Injectable()
export class DataPermissionService {
  /**
   * Get data permission rules for given roles and resource type.
   */
  async getRulesForRoles(roleIds: string[], resourceType: string): Promise<DataPermission[]> {
    const em = getOrm().em.fork()

    // Get role entities to match against
    const roles = await em.find(Role, { code: { $in: roleIds } })
    if (roles.length === 0) return []

    const rules = await em.find(
      DataPermission,
      {
        role: { $in: roles.map(r => r.id) },
        resourceType,
        deletedAt: null,
      },
      { filter: ['soft-delete'], orderBy: { priority: 'DESC' } },
    )

    return rules
  }

  /**
   * Generate MikroORM filter conditions based on user's roles and resource type.
   *
   * @param roleIds - User's role codes
   * @param resourceType - The resource type to filter (e.g., 'user', 'department')
   * @param userId - Current user ID (for 'own' filter type)
   * @returns DataScopeResult with filter conditions
   */
  async generateFilter(
    roleIds: string[],
    resourceType: string,
    userId?: string,
  ): Promise<DataScopeResult> {
    // Admin role has full access
    if (roleIds.includes('admin')) {
      return { filter: {}, hasFullAccess: true }
    }

    const rules = await this.getRulesForRoles(roleIds, resourceType)
    if (rules.length === 0) {
      return { filter: {}, hasFullAccess: false }
    }

    // Build filter conditions from rules
    const filterConditions: Record<string, any>[] = []

    for (const rule of rules) {
      const condition = this.buildCondition(rule.filterField, rule.filterOperator, rule.filterValue, userId)
      if (condition) {
        if (rule.allow) {
          filterConditions.push(condition)
        } else {
          // Deny rules would be applied differently - for now we treat all as allow
          filterConditions.push(condition)
        }
      }
    }

    if (filterConditions.length === 0) {
      return { filter: {}, hasFullAccess: false }
    }

    // Combine conditions with OR for allow rules
    // In a more complex system, you might want AND logic
    return {
      filter: { $or: filterConditions },
      hasFullAccess: false,
    }
  }

  /**
   * Build a single filter condition for MikroORM.
   */
  private buildCondition(
    field: string,
    operator: FilterOperator,
    value: string,
    userId?: string,
  ): Record<string, any> | null {
    // Handle special 'own' value that refers to current user
    let actualValue = value
    if (value === '$userId' && userId) {
      actualValue = userId
    }

    switch (operator) {
      case 'eq':
        return { [field]: actualValue }
      case 'neq':
        return { [field]: { $ne: actualValue } }
      case 'in':
        return { [field]: { $in: JSON.parse(actualValue) } }
      case 'nin':
        return { [field]: { $nin: JSON.parse(actualValue) } }
      case 'like':
        return { [field]: { $like: actualValue } }
      case 'gt':
        return { [field]: { $gt: actualValue } }
      case 'gte':
        return { [field]: { $gte: actualValue } }
      case 'lt':
        return { [field]: { $lt: actualValue } }
      case 'lte':
        return { [field]: { $lte: actualValue } }
      case 'isnull':
        return { [field]: null }
      case 'isnotnull':
        return { [field]: { $ne: null } }
      default:
        return null
    }
  }

  /**
   * Create a data permission rule.
   */
  async createRule(data: {
    roleId: string
    resourceType: string
    filterField: string
    filterOperator: FilterOperator
    filterValue: string | any[]
    priority?: number
    allow?: boolean
  }) {
    const em = getOrm().em.fork()

    const rule = em.create(DataPermission, {
      id: crypto.randomUUID(),
      role: data.roleId as any,
      resourceType: data.resourceType,
      filterField: data.filterField,
      filterOperator: data.filterOperator,
      filterValue: typeof data.filterValue === 'string' ? data.filterValue : JSON.stringify(data.filterValue),
      priority: data.priority ?? 0,
      allow: data.allow ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })

    await em.persistAndFlush(rule)
    return this.ruleToRow(rule)
  }

  /**
   * Delete a data permission rule.
   */
  async deleteRule(id: string) {
    const em = getOrm().em.fork()
    const rule = await em.findOne(DataPermission, { id })
    if (!rule) return false

    rule.deletedAt = new Date()
    await em.flush()
    return true
  }

  /**
   * Find rules by resource type.
   */
  async findByResourceType(resourceType: string) {
    const em = getOrm().em.fork()
    const rules = await em.find(DataPermission, { resourceType }, { filter: ['soft-delete'] })
    return rules.map(r => this.ruleToRow(r))
  }

  private ruleToRow(rule: DataPermission) {
    return {
      id: rule.id,
      roleId: typeof rule.role === 'object' ? (rule.role as Role).id : rule.role,
      resourceType: rule.resourceType,
      filterField: rule.filterField,
      filterOperator: rule.filterOperator,
      filterValue: rule.filterValue,
      priority: rule.priority,
      allow: Boolean(rule.allow),
      createdAt: rule.createdAt instanceof Date ? rule.createdAt.toISOString() : String(rule.createdAt),
      updatedAt: rule.updatedAt instanceof Date ? rule.updatedAt.toISOString() : String(rule.updatedAt),
    }
  }
}
