import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { getRoleDb, rowToRole, RoleRow } from '../entities/role.entity'

@Injectable()
export class RoleService {
  private db = getRoleDb()

  findAll() {
    const rows = this.db.prepare('SELECT * FROM roles ORDER BY created_at DESC').all() as RoleRow[]
    return rows.map(rowToRole)
  }

  findOne(id: string) {
    const row = this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as RoleRow | undefined
    return row ? rowToRole(row) : null
  }

  findByCode(code: string) {
    const row = this.db.prepare('SELECT * FROM roles WHERE code = ?').get(code) as RoleRow | undefined
    return row ? rowToRole(row) : null
  }

  create(data: { name: string; code: string; description?: string; permissions?: string[] }) {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO roles (id, name, code, description, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.code, data.description ?? null, JSON.stringify(data.permissions ?? []), now, now)
    return this.findOne(id)
  }

  update(id: string, data: Partial<{ name: string; code: string; description: string; permissions: string[]; enabled: boolean }>) {
    const existing = this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as RoleRow | undefined
    if (!existing) return null

    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name) }
    if (data.code !== undefined) { updates.push('code = ?'); values.push(data.code) }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description) }
    if (data.permissions !== undefined) { updates.push('permissions = ?'); values.push(JSON.stringify(data.permissions)) }
    if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0) }
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    this.db.prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return this.findOne(id)
  }

  delete(id: string) {
    // Prevent deletion of admin role
    const role = this.findOne(id)
    if (role?.code === 'admin') return { success: false, message: '不能删除管理员角色' }
    const result = this.db.prepare('DELETE FROM roles WHERE id = ?').run(id)
    return { success: result.changes > 0 }
  }
}
