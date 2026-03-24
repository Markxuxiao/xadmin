import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import * as crypto from 'crypto'
import { MikroORM } from '@mikro-orm/postgresql'
import { Role } from '../base/entities/role.entity'
import { createTestOrm, closeTestOrm } from './helpers/test-db'

describe('Role Entity (MikroORM + PostgreSQL)', () => {
  let orm: MikroORM
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let em: any

  beforeAll(async () => {
    orm = await createTestOrm()
  })

  beforeEach(async () => {
    // Fork a fresh EntityManager for each test to avoid state pollution
    em = orm.em.fork()
    // Clear tables between tests to avoid unique constraint conflicts
    await em.nativeDelete(Role, {})
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  describe('CRUD via EntityManager', () => {
    it('should create and persist a role', async () => {
      const role = em.create(Role, {
        id: crypto.randomUUID(),
        name: 'Editor',
        code: 'editor',
        description: 'Editor role',
        permissions: JSON.stringify(['content:read', 'content:write']),
        enabled: true,
        deletedAt: null,
      })

      await em.persistAndFlush(role)
      em.clear()

      const found = await em.findOne(Role, { id: role.id })
      expect(found).not.toBeNull()
      expect(found!.name).toBe('Editor')
      expect(found!.code).toBe('editor')
      expect(found!.permissions).toBe('["content:read","content:write"]')
    })

    it('should create role with minimal fields', async () => {
      const role = em.create(Role, {
        id: crypto.randomUUID(),
        name: 'Viewer',
        code: 'viewer',
        permissions: JSON.stringify([]),
        enabled: true,
        deletedAt: null,
      })

      await em.persistAndFlush(role)
      em.clear()

      const found = await em.findOne(Role, { id: role.id })
      expect(found!.description).toBeNull()
      expect(found!.permissions).toBe('[]')
    })

    it('should update a role', async () => {
      const role = em.create(Role, {
        id: crypto.randomUUID(),
        name: 'ToUpdate',
        code: 'to_update',
        description: 'Original',
        permissions: JSON.stringify(['a']),
        enabled: true,
        deletedAt: null,
      })
      await em.persistAndFlush(role)

      em.clear()
      const toUpdate = await em.findOne(Role, { id: role.id })
      toUpdate!.name = 'Updated'
      toUpdate!.description = 'New description'
      toUpdate!.permissions = JSON.stringify(['a', 'b'])
      await em.flush()
      em.clear()

      const found = await em.findOne(Role, { id: role.id })
      expect(found!.name).toBe('Updated')
      expect(found!.description).toBe('New description')
    })

    it('should soft-delete a role (set deletedAt)', async () => {
      const role = em.create(Role, {
        id: crypto.randomUUID(),
        name: 'Deletable',
        code: 'deletable',
        permissions: JSON.stringify([]),
        enabled: true,
        deletedAt: null,
      })
      await em.persistAndFlush(role)

      em.clear()
      const toDelete = await em.findOne(Role, { id: role.id })
      toDelete!.deletedAt = new Date()
      await em.flush()
      em.clear()

      // Without filter, should still find it
      const found = await em.findOne(Role, { id: role.id })
      expect(found).not.toBeNull()

      // With explicit deletedAt condition, should not find it
      const filtered = await em.find(Role, { id: role.id, deletedAt: null })
      expect(filtered.length).toBe(0)
    })

    it('should enforce unique code constraint', async () => {
      const role1 = em.create(Role, {
        id: crypto.randomUUID(),
        name: 'Role A',
        code: 'unique_code',
        permissions: JSON.stringify([]),
        enabled: true,
        deletedAt: null,
      })
      await em.persistAndFlush(role1)
      em.clear()

      try {
        const duplicate = em.create(Role, {
          id: crypto.randomUUID(),
          name: 'Role B',
          code: 'unique_code',
          permissions: JSON.stringify([]),
          enabled: true,
          deletedAt: null,
        })
        await em.persistAndFlush(duplicate)
        em.clear()
        // If we reach here, unique constraint was not enforced
        expect(true).toBe(false)
      } catch (e: any) {
        expect(e.message.toLowerCase()).toMatch(/unique|duplicate/)
      }
    })
  })
})
