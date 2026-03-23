import Database from 'better-sqlite3'
import { join } from 'path'

let _db: Database.Database | null = null

function getDatabase(): Database.Database {
  if (!_db) {
    // Use __dirname-relative path so the DB is always next to this source file
    const dbPath = join(__dirname, '../../../../apps/project-alpha/backend/xadmin.db')
    _db = new Database(dbPath)
    _db.pragma('journal_mode = WAL')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: Database.Database) {
  // Users table
  db.exec(`
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
      updated_by TEXT
    )
  `)

  // Seed default admin if not exists
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE username = ?').get('admin') as { cnt: number }
  if (userCount.cnt === 0) {
    db.prepare(`
      INSERT INTO users (id, username, password, nickname, roles, permissions, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('1', 'admin', '$2b$10$89B6vpgDNKfu1.ODenIY2.HdKPHbFza96cIoIU.gtCbFQmCqYrm9K', '管理员', JSON.stringify(['admin']), JSON.stringify(['user:list', 'user:create', 'user:edit', 'user:delete']), 1)
    console.log('[XAdmin] Default admin user created (admin/admin)')
  }

  // Roles table
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
  const roleCount = db.prepare('SELECT COUNT(*) as cnt FROM roles').get() as { cnt: number }
  if (roleCount.cnt === 0) {
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

// Re-export for backward compatibility
export { getDatabase as getDb }
