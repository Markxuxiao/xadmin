import 'reflect-metadata'
import { EntityManager } from '@mikro-orm/core'
import { User } from './entities/user.entity'
import { Role } from './entities/role.entity'
import { Dict } from './entities/dict.entity'
import { Menu } from './entities/menu.entity'
import { ScheduledTask } from './entities/scheduled-task.entity'

// ============================================================================
// Seed data
// ============================================================================

/**
 * Seed reference data if database is empty.
 * Called by initMikroORM() after schema is ready.
 */
export async function seedIfEmpty(em: EntityManager): Promise<void> {
  const userCount = await em.count(User, {})
  if (userCount > 0) {
    console.log('[XAdmin] Seed: data exists, skipping seed')
    return
  }

  // Seed roles first
  const now = new Date()
  const adminRole = em.create(Role, {
    id: 'r1',
    name: '超级管理员',
    code: 'admin',
    description: '拥有所有权限',
    permissions: JSON.stringify(['*']),
    enabled: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  })

  const userRole = em.create(Role, {
    id: 'r2',
    name: '普通用户',
    code: 'user',
    description: '普通用户角色',
    permissions: JSON.stringify(['user:list']),
    enabled: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  })

  await em.persistAndFlush([adminRole, userRole])

  // Seed admin user (bcrypt hash of 'admin')
  // Hash generated via: bcrypt.hashSync('admin', 10)
  const adminUser = em.create(User, {
    id: '1',
    username: 'admin',
    password: '$2b$10$89B6vpgDNKfu1.ODenIY2.HdKPHbFza96cIoIU.gtCbFQmCqYrm9K',
    nickname: '管理员',
    roles: JSON.stringify(['admin']),
    permissions: JSON.stringify(['user:list', 'user:create', 'user:edit', 'user:delete']),
    enabled: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  })

  await em.persistAndFlush(adminUser)
  console.log('[XAdmin] Seed: admin user + roles created')

  // Seed default dicts
  const defaultDicts = [
    {
      id: 'd1',
      name: '用户状态',
      code: 'user_status',
      type: 'dict',
      items: JSON.stringify([
        { label: '启用', value: '1', sort: 1 },
        { label: '禁用', value: '0', sort: 2 },
      ]),
      sort: 1,
      enabled: true,
    },
    {
      id: 'd2',
      name: '角色状态',
      code: 'role_status',
      type: 'dict',
      items: JSON.stringify([
        { label: '启用', value: '1', sort: 1 },
        { label: '禁用', value: '0', sort: 2 },
      ]),
      sort: 2,
      enabled: true,
    },
    {
      id: 'd3',
      name: '系统名称',
      code: 'system_name',
      type: 'system',
      value: 'XAdmin',
      sort: 1,
      enabled: true,
    },
  ]

  for (const dictData of defaultDicts) {
    const dict = em.create(Dict, { ...dictData, createdAt: now, updatedAt: now, deletedAt: null, version: 1 })
    await em.persistAndFlush(dict)
  }
  console.log('[XAdmin] Seed: default dicts created')

  // Seed notification type dicts
  const notificationTypeDicts = [
    {
      id: 'd4',
      name: '通知类型',
      code: 'notification_type',
      type: 'dict',
      items: JSON.stringify([
        { label: '系统通知', value: 'system', sort: 1 },
        { label: '用户通知', value: 'user', sort: 2 },
        { label: '任务通知', value: 'task', sort: 3 },
        { label: '审批通知', value: 'approval', sort: 4 },
        { label: '消息通知', value: 'message', sort: 5 },
      ]),
      sort: 3,
      enabled: true,
    },
  ]

  for (const dictData of notificationTypeDicts) {
    const dict = em.create(Dict, { ...dictData, createdAt: now, updatedAt: now, deletedAt: null, version: 1 })
    await em.persistAndFlush(dict)
  }
  console.log('[XAdmin] Seed: notification type dicts created')

  // Seed default scheduled tasks
  const defaultScheduledTasks = [
    {
      id: 'st1',
      name: '清理7天前操作日志',
      description: '自动清理7天前的操作日志记录',
      cron: '0 2 * * *', // 每天凌晨2点执行
      handler: 'clean-old-audit-logs',
      enabled: true,
      isBuiltin: true,
      taskParams: JSON.stringify({ days: 7 }),
    },
    {
      id: 'st2',
      name: '统计每日用户活跃',
      description: '统计每日用户活跃数据并生成报表',
      cron: '0 0 * * *', // 每天凌晨0点执行
      handler: 'count-daily-user-activity',
      enabled: false, // 默认不启用
      isBuiltin: true,
      taskParams: null,
    },
  ]

  for (const taskData of defaultScheduledTasks) {
    const task = em.create(ScheduledTask, {
      ...taskData,
      lastExecutedAt: null,
      lastExecutedResult: null,
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })
    await em.persistAndFlush(task)
  }
  console.log('[XAdmin] Seed: default scheduled tasks created')

  // Seed default menus
  const defaultMenus = [
    { id: 'm1', path: '/dashboard', title: '首页', icon: 'HomeFilled', parentId: null, sort: 1, enabled: true },
    { id: 'm2', path: '/system', title: '系统管理', icon: 'Setting', parentId: null, sort: 2, enabled: true },
    { id: 'm3', path: '/system/user', title: '用户管理', icon: 'User', parentId: 'm2', sort: 1, enabled: true, permission: 'user:list' },
    { id: 'm4', path: '/system/role', title: '角色管理', icon: 'UserFilled', parentId: 'm2', sort: 2, enabled: true, permission: 'role:list' },
    { id: 'm5', path: '/system/menu', title: '菜单管理', icon: 'Menu', parentId: 'm2', sort: 3, enabled: true, permission: 'menu:list' },
    { id: 'm6', path: '/system/dict', title: '字典管理', icon: 'Document', parentId: 'm2', sort: 4, enabled: true, permission: 'dict:list' },
  ]

  for (const m of defaultMenus) {
    const existing = await em.findOne(Menu, { id: m.id })
    if (!existing) {
      const menu = em.create(Menu, { ...m, deletedAt: null, createdAt: now, updatedAt: now, version: 1 })
      await em.persistAndFlush(menu)
    }
  }
  console.log('[XAdmin] Seed: default menus created')
}
