import 'reflect-metadata'
import { join } from 'path'
import Database from 'better-sqlite3'

const DB_PATH = join(__dirname, '../../../../apps/project-alpha/backend/xadmin.db')

let _db: Database.Database | null = null

/**
 * Initialize database with MikroORM-compatible schema.
 * - Creates tables if not exist (backward compat)
 * - Adds version + deletedAt columns (MikroORM compatibility)
 * - Seeds admin user + roles
 *
 * Phase 3 will replace this with proper MikroORM migrations.
 */
function getDatabase(): Database.Database {
  if (_db) return _db

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')

  // Users table — MikroORM-compatible (adds version + deletedAt if missing)
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT,
      roles TEXT NOT NULL DEFAULT '[]',
      permissions TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT,
      updated_by TEXT,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 1
    )
  `)

  // Add missing columns to existing tables (MikroORM entity compatibility)
  const userInfo = _db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
  const userCols = new Set(userInfo.map(c => c.name))
  if (!userCols.has('deleted_at')) {
    _db.exec('ALTER TABLE users ADD COLUMN deleted_at TEXT')
  }
  if (!userCols.has('version')) {
    _db.exec('ALTER TABLE users ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
  }

  // Roles table — MikroORM-compatible
  _db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT,
      updated_by TEXT,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 1
    )
  `)

  const roleInfo = _db.prepare('PRAGMA table_info(roles)').all() as { name: string }[]
  const roleCols = new Set(roleInfo.map(c => c.name))
  if (!roleCols.has('deleted_at')) {
    _db.exec('ALTER TABLE roles ADD COLUMN deleted_at TEXT')
  }
  if (!roleCols.has('version')) {
    _db.exec('ALTER TABLE roles ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
  }

  // Seed data
  const userCount = _db.prepare('SELECT COUNT(*) as cnt FROM users WHERE username = ?').get('admin') as { cnt: number }
  if (userCount.cnt === 0) {
    _db.prepare(`
      INSERT INTO users (id, username, password, nickname, roles, permissions, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('1', 'admin', '$2b$10$89B6vpgDNKfu1.ODenIY2.HdKPHbFza96cIoIU.gtCbFQmCqYrm9K', '管理员', JSON.stringify(['admin']), JSON.stringify(['user:list', 'user:create', 'user:edit', 'user:delete']), 1)
    console.log('[XAdmin] Default admin user created (admin/admin)')
  }

  const roleCount = _db.prepare('SELECT COUNT(*) as cnt FROM roles').get() as { cnt: number }
  if (roleCount.cnt === 0) {
    const seedRoles = [
      { id: 'r1', name: '超级管理员', code: 'admin', description: '拥有所有权限', permissions: ['*'], enabled: 1 },
      { id: 'r2', name: '普通用户', code: 'user', description: '普通用户角色', permissions: ['user:list'], enabled: 1 },
    ]
    const stmt = _db.prepare(`
      INSERT INTO roles (id, name, code, description, permissions, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)
    for (const role of seedRoles) {
      stmt.run(role.id, role.name, role.code, role.description, JSON.stringify(role.permissions), role.enabled)
    }
    console.log('[XAdmin] Default roles seeded')
  }

  return _db
}

export { getDatabase as getDb, DB_PATH }

// MikroORM init (available when native module issue is resolved — Phase 2)
// export { initMikroORM, getOrm }
