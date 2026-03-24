import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import * as bcrypt from 'bcrypt'
import { getOrm, User } from '../../base'

@Injectable()
export class UserService {
  // ===== 密码工具方法 =====

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // ===== CRUD =====

  async findAll(dataScopeFilter?: Record<string, any>) {
    const em = getOrm().em.fork()
    const filter = dataScopeFilter ? { ...dataScopeFilter } : {}
    const users = await em.find(User, { ...filter, deletedAt: null })
    return users.map(u => this.userToRow(u))
  }

  async findOne(id: string) {
    const em = getOrm().em.fork()
    const user = await em.findOne(User, { id, deletedAt: null })
    return user ? this.userToRow(user) : null
  }

  async create(data: { username: string; password: string; nickname: string; roles?: string[]; permissions?: string[] }) {
    const em = getOrm().em.fork()
    const hashedPassword = await this.hashPassword(data.password)
    const now = new Date()
    const user = em.create(User, {
      id: crypto.randomUUID(),
      username: data.username,
      password: hashedPassword,
      nickname: data.nickname,
      avatar: null,
      roles: JSON.stringify(data.roles ?? []),
      permissions: JSON.stringify(data.permissions ?? []),
      enabled: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })
    await em.persistAndFlush(user)
    return this.userToRow(user)
  }

  async update(id: string, data: Partial<{ password: string; nickname: string; roles: string[]; permissions: string[]; enabled: boolean }>) {
    const em = getOrm().em.fork()
    const user = await em.findOne(User, { id })
    if (!user) return null

    if (data.password !== undefined) {
      user.password = await this.hashPassword(data.password)
    }
    if (data.nickname !== undefined) { user.nickname = data.nickname }
    if (data.roles !== undefined) { user.roles = JSON.stringify(data.roles) }
    if (data.permissions !== undefined) { user.permissions = JSON.stringify(data.permissions) }
    if (data.enabled !== undefined) { user.enabled = data.enabled }
    user.updatedAt = new Date()

    await em.flush()
    return this.userToRow(user)
  }

  async delete(id: string) {
    const em = getOrm().em.fork()
    const user = await em.findOne(User, { id })
    if (!user) return false
    user.deletedAt = new Date()
    await em.flush()
    return true
  }

  // ===== 私有辅助方法 =====

  private userToRow(user: User) {
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      nickname: user.nickname,
      avatar: user.avatar,
      roles: user.roles,
      permissions: user.permissions,
      enabled: user.enabled ? 1 : 0,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : String(user.updatedAt),
      created_by: null,
      updated_by: null,
    }
  }
}
