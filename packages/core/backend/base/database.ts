import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/postgresql'
import { PostgreSqlDriver } from '@mikro-orm/postgresql'
import { User } from './entities/user.entity'
import { Role } from './entities/role.entity'

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
// MikroORM instance (used by Phase 2+ EntityManager services)
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
    entities: [User, Role],
    driver: PostgreSqlDriver,
    host: PG_CONFIG.host,
    port: PG_CONFIG.port,
    user: PG_CONFIG.user,
    password: PG_CONFIG.password,
    dbName: PG_CONFIG.dbName,
    allowGlobalContext: true,
    debug: process.env.NODE_ENV !== 'production',
  })

  // Create schema (CREATE TABLE IF NOT EXISTS for each entity)
  const generator = _orm.getSchemaGenerator()
  await generator.createSchema()
  console.log('[XAdmin] PostgreSQL schema created')

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
    enabled: true,
  })

  await em.persistAndFlush(adminUser)
  console.log('[XAdmin] Seed: admin user + roles created')
}

// ============================================================================
// Legacy better-sqlite3 interface (backward compat — Phase 1 services still use this)
// ============================================================================

import Database from 'better-sqlite3'
import { join } from 'path'

const DB_PATH = join(__dirname, '../../../../apps/project-alpha/backend/xadmin.db')

let _db: Database.Database | null = null

function getDatabase(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
  }
  return _db
}

// ============================================================================
// Exports
// ============================================================================

// Legacy — returns better-sqlite3 Database (existing services use this)
export { getDatabase as getDb, DB_PATH }

// New — MikroORM instance for Phase 2+ EntityManager services
export { initMikroORM, getOrm }
export { User, Role }
