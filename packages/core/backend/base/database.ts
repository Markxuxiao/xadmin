import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/postgresql'
import { PostgreSqlDriver } from '@mikro-orm/postgresql'
import { User } from './entities/user.entity'
import { Role } from './entities/role.entity'
import { Dict } from './entities/dict.entity'
import { AuditLog } from './entities/audit-log.entity'
import { FileRecord } from './entities/file.entity'
import { Department } from './entities/department.entity'
import { DataPermission } from './entities/data-permission.entity'
import { MenuPermission } from './entities/menu-permission.entity'
import { Notification } from './entities/notification.entity'
import { ScheduledTask } from './entities/scheduled-task.entity'

// ============================================================================
// PostgreSQL connection config
// ============================================================================

const PG_CONFIG = {
  host: process.env.PG_HOST ?? 'localhost',
  port: parseInt(process.env.PG_PORT ?? '5432', 10),
  user: process.env.PG_USER ?? 'postgres',
  password: process.env.PG_PASSWORD ?? '',
  dbName: process.env.PG_DATABASE ?? 'xadmin',
}

// ============================================================================
// MikroORM instance
// ============================================================================

let _orm: MikroORM | null = null

/**
 * Initialize MikroORM with PostgreSQL.
 * - Creates schema from entity definitions (CREATE TABLE IF NOT EXISTS)
 * - Seeds admin user + roles
 */
async function initMikroORM(): Promise<MikroORM> {
  if (_orm) return _orm

  _orm = await MikroORM.init({
    entities: [User, Role, Dict, AuditLog, FileRecord, Department, DataPermission, MenuPermission, Notification, ScheduledTask],
    driver: PostgreSqlDriver,
    host: PG_CONFIG.host,
    port: PG_CONFIG.port,
    user: PG_CONFIG.user,
    password: PG_CONFIG.password,
    dbName: PG_CONFIG.dbName,
    allowGlobalContext: true,
    debug: process.env.NODE_ENV !== 'production',
  })

  // Create or update schema
  const generator = _orm.getSchemaGenerator()
  await generator.updateSchema()
  console.log('[XAdmin] PostgreSQL schema ready')

  // Seed reference data
  await seedIfEmpty(_orm.em)

  return _orm
}

function getOrm(): MikroORM {
  if (!_orm) {
    throw new Error('[XAdmin] MikroORM not initialized. Call initMikroORM() first.')
  }
  return _orm
}

// ============================================================================
// Seed data (using MikroORM EntityManager)
// ============================================================================

async function seedIfEmpty(em: any) {
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
}

// ============================================================================
// Exports
// ============================================================================

export { initMikroORM, getOrm }
export { User, Role, Dict, AuditLog, FileRecord, Department, DataPermission, MenuPermission, Notification, ScheduledTask }

// ============================================================================
// Test utilities
// ============================================================================

/**
 * Inject a test ORM instance so that getOrm() works in test environments.
 * Called by __tests__/helpers/test-db.ts after createTestOrm().
 */
export function setTestOrm(orm: MikroORM): void {
  _orm = orm
}
