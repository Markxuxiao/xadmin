import { MikroORM } from '@mikro-orm/postgresql'
import { PostgreSqlDriver } from '@mikro-orm/postgresql'
import { Client } from 'pg'
import { User } from '../../base/entities/user.entity'
import { Role } from '../../base/entities/role.entity'
import { Dict } from '../../base/entities/dict.entity'
import { DataPermission } from '../../base/entities/data-permission.entity'
import { MenuPermission } from '../../base/entities/menu-permission.entity'
import { Notification } from '../../base/entities/notification.entity'
import { ScheduledTask } from '../../base/entities/scheduled-task.entity'
import { AuditLog } from '../../base/entities/audit-log.entity'
import { setTestOrm, getOrm } from '../../base/database'
export { getOrm }

let _orm: MikroORM | null = null

/**
 * Create a fresh test database and return the ORM instance.
 * Uses a unique database name to avoid conflicts between test runs.
 */
export async function createTestOrm(): Promise<MikroORM> {
  if (_orm) {
    await _orm.close()
    _orm = null
  }

  // Use a unique database name based on process ID and timestamp
  const testDbName = `xadmin_test_${process.pid}_${Date.now()}`

  // Use a fresh Client for admin operations
  const admin = new Client({
    host: process.env.PG_HOST ?? 'localhost',
    port: parseInt(process.env.PG_PORT ?? '5432', 10),
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD ?? '',
    database: 'postgres',
  })

  await admin.connect()

  // Check if database exists
  const dbExists = await admin.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [testDbName]
  )

  if (dbExists.rows.length > 0) {
    // Terminate all connections to test database
    try {
      await admin.query(`SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${testDbName}' AND pid <> pg_backend_pid()`)
    } catch (e) {
      // Ignore errors
    }
    // Drop database
    await admin.query(`DROP DATABASE ${testDbName}`)
  }

  await admin.query(`CREATE DATABASE ${testDbName}`)

  await admin.end()

  _orm = await MikroORM.init({
    entities: [User, Role, Dict, DataPermission, MenuPermission, Notification, ScheduledTask, AuditLog],
    driver: PostgreSqlDriver,
    host: process.env.PG_HOST ?? 'localhost',
    port: parseInt(process.env.PG_PORT ?? '5432', 10),
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD ?? '',
    dbName: testDbName,
    allowGlobalContext: true,
    debug: false,
  })

  const generator = _orm.getSchemaGenerator()
  await generator.createSchema()

  // Seed essential test data
  await seedTestData(_orm.em)

  // Inject into base/database.ts so services using getOrm() work in tests
  setTestOrm(_orm)

  return _orm
}

/**
 * Seed essential test data (admin role + user).
 * These are referenced by service tests that don't create their own data.
 */
async function seedTestData(em: any) {
  const now = new Date()

  // Admin role — referenced by role.service tests
  const adminRole = em.create(Role, {
    id: 'a0000000-0000-0000-0000-000000000001',
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

  // Regular user role
  const userRole = em.create(Role, {
    id: 'a0000000-0000-0000-0000-000000000002',
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

  // Admin user (bcrypt hash of 'admin')
  const adminUser = em.create(User, {
    id: 'b0000000-0000-0000-0000-000000000001',
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

  // Default scheduled tasks (built-in)
  const cleanOldAuditLogsTask = em.create(ScheduledTask, {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: '清理7天前操作日志',
    description: '自动清理7天前的操作日志记录',
    cron: '0 2 * * *',
    handler: 'clean-old-audit-logs',
    enabled: true,
    isBuiltin: true,
    taskParams: JSON.stringify({ days: 7 }),
    lastExecutedAt: null,
    lastExecutedResult: null,
    consecutiveFailures: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  })

  const countDailyUserActivityTask = em.create(ScheduledTask, {
    id: 'c0000000-0000-0000-0000-000000000002',
    name: '统计每日用户活跃',
    description: '统计每日用户活跃数据并生成报表',
    cron: '0 0 * * *',
    handler: 'count-daily-user-activity',
    enabled: false,
    isBuiltin: true,
    taskParams: null,
    lastExecutedAt: null,
    lastExecutedResult: null,
    consecutiveFailures: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  })

  await em.persistAndFlush([cleanOldAuditLogsTask, countDailyUserActivityTask])
}

/**
 * Close the test ORM.
 */
export async function closeTestOrm() {
  if (_orm) {
    await _orm.close()
    _orm = null
  }
}
