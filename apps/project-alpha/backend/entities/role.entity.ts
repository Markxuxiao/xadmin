import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let _db: Database.Database | null = null

export function getRoleDb(): Database.Database {
  if (!_db) {
    const dbPath = join(__dirname, '../../xadmin.db')
    _db = new Database(dbPath)
    _db.pragma('journal_mode = WAL')
    initRoleSchema(_db)
  }
  return _db
}

function initRoleSchema(db: Database.Database) {
  db.exec(`
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
      updated_by TEXT
    )
  `)

  // Seed default roles if not exists
  const count = db.prepare('SELECT COUNT(*) as cnt FROM roles').get() as { cnt: number }
  if (count.cnt === 0) {
    const seedRoles = [
      { id: 'r1', name: '超级管理员', code: 'admin', description: '拥有所有权限', permissions: ['*'], enabled: 1 },
      { id: 'r2', name: '普通用户', code: 'user', description: '普通用户角色', permissions: ['user:list'], enabled: 1 },
    ]
    const stmt = db.prepare(`
      INSERT INTO roles (id, name, code, description, permissions, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)
    for (const role of seedRoles) {
      stmt.run(role.id, role.name, role.code, role.description, JSON.stringify(role.permissions), role.enabled)
    }
    console.log('[XAdmin] Default roles seeded')
  }
}

export interface RoleRow {
  id: string
  name: string
  code: string
  description: string | null
  permissions: string
  enabled: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export function rowToRole(row: RoleRow) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    permissions: JSON.parse(row.permissions),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
