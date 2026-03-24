import { MikroORM } from '@mikro-orm/postgresql'
import { PostgreSqlDriver } from '@mikro-orm/postgresql'
import { Client } from 'pg'
import { User } from '../../base/entities/user.entity'
import { Role } from '../../base/entities/role.entity'
import { setTestOrm } from '../../base/database'

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

  // Terminate all connections to test database (if it exists from a previous run)
  try {
    await admin.query(`SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${testDbName}' AND pid <> pg_backend_pid()`)
    // Also handle case where database exists from a crashed previous run
    await admin.query(`DROP DATABASE IF EXISTS ${testDbName}`)
  } catch (e) {
    // Ignore errors - database might not exist
  }

  await admin.query(`CREATE DATABASE ${testDbName}`)

  await admin.end()

  _orm = await MikroORM.init({
    entities: [User, Role],
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
