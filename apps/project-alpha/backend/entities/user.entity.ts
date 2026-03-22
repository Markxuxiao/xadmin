import Database from 'better-sqlite3'
import { join } from 'path'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = join(process.cwd(), 'xadmin.db')
    _db = new Database(dbPath)
    _db.pragma('journal_mode = WAL')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: Database.Database) {
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
  const count = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE username = ?').get('admin') as { cnt: number }
  if (count.cnt === 0) {
    db.prepare(`
      INSERT INTO users (id, username, password, nickname, roles, permissions, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('1', 'admin', 'admin', '管理员', JSON.stringify(['admin']), JSON.stringify(['user:list', 'user:create', 'user:edit', 'user:delete']), 1)
    console.log('[XAdmin] Default admin user created (admin/admin)')
  }
}

export interface UserRow {
  id: string
  username: string
  password: string
  nickname: string
  avatar: string | null
  roles: string
  permissions: string
  enabled: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export function rowToUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatar: row.avatar,
    roles: JSON.parse(row.roles),
    permissions: JSON.parse(row.permissions),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
