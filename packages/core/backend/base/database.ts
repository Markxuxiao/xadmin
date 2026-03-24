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
import { Menu } from './entities/menu.entity'
import { Notification } from './entities/notification.entity'
import { ScheduledTask } from './entities/scheduled-task.entity'
import { seedIfEmpty } from './database.seed'

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
    entities: [User, Role, Dict, AuditLog, FileRecord, Department, DataPermission, MenuPermission, Menu, Notification, ScheduledTask],
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
// Exports
// ============================================================================

export { initMikroORM, getOrm }
export { User, Role, Dict, AuditLog, FileRecord, Department, DataPermission, MenuPermission, Menu, Notification, ScheduledTask }

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
