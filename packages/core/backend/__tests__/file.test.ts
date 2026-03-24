import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { FileService } from '../core/file/file.service'
import { createTestOrm, closeTestOrm, getOrm } from './helpers/test-db'
import { FileRecord } from '../base/entities/file.entity'
import * as fs from 'fs'
import * as path from 'path'

// Mock the fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

describe('FileService', () => {
  let fileService: FileService
  let mockFs: typeof fs

  beforeAll(async () => {
    await createTestOrm()
  })

  beforeEach(async () => {
    fileService = new FileService()
    mockFs = fs as unknown as typeof fs
    vi.clearAllMocks()
    // Clean up test file records before each test
    const em = getOrm().em.fork()
    await em.createQueryBuilder(FileRecord).truncate().execute()
  })

  afterAll(async () => {
    await closeTestOrm()
  })

  // =============================================================================
  // upload
  // =============================================================================

  describe('upload', () => {
    it('should upload a file successfully', async () => {
      const mockFile = {
        originalname: 'test.txt',
        buffer: Buffer.from('test content'),
        mimetype: 'text/plain',
        size: 12,
      }
      const uploader = { id: 'user-1', username: 'testuser' }

      const result = await fileService.upload(mockFile, 'attachment', uploader)

      expect(result).toBeDefined()
      expect(result.originalName).toBe('test.txt')
      expect(result.mimeType).toBe('text/plain')
      expect(result.size).toBe(12)
      expect(result.category).toBe('attachment')
      expect(result.uploaderId).toBe('user-1')
      expect(result.uploaderName).toBe('testuser')
      expect(result.refCount).toBe(0)
      expect(result.url).toContain('/uploads/attachment/')
      expect(mockFs.writeFileSync).toHaveBeenCalled()
    })

    it('should reject category with path traversal (double dot)', async () => {
      const mockFile = {
        originalname: 'test.txt',
        buffer: Buffer.from('test content'),
        mimetype: 'text/plain',
        size: 12,
      }
      const uploader = { id: 'user-1', username: 'testuser' }

      await expect(
        fileService.upload(mockFile, '../etc/passwd', uploader)
      ).rejects.toThrow('Invalid category: no path traversal allowed')
    })

    it('should reject category with single dot path traversal', async () => {
      const mockFile = {
        originalname: 'test.txt',
        buffer: Buffer.from('test content'),
        mimetype: 'text/plain',
        size: 12,
      }
      const uploader = { id: 'user-1', username: 'testuser' }

      await expect(
        fileService.upload(mockFile, 'a/../b', uploader)
      ).rejects.toThrow('Invalid category: no path traversal allowed')
    })

    it('should reject category with invalid characters', async () => {
      const mockFile = {
        originalname: 'test.txt',
        buffer: Buffer.from('test content'),
        mimetype: 'text/plain',
        size: 12,
      }
      const uploader = { id: 'user-1', username: 'testuser' }

      await expect(
        fileService.upload(mockFile, 'category@#$', uploader)
      ).rejects.toThrow('Invalid category: only alphanumeric, underscore, and hyphen allowed')
    })

    it('should reject empty category', async () => {
      const mockFile = {
        originalname: 'test.txt',
        buffer: Buffer.from('test content'),
        mimetype: 'text/plain',
        size: 12,
      }
      const uploader = { id: 'user-1', username: 'testuser' }

      await expect(
        fileService.upload(mockFile, '', uploader)
      ).rejects.toThrow('Invalid category: no path traversal allowed')
    })

    it('should accept valid categories', async () => {
      const mockFile = {
        originalname: 'test.txt',
        buffer: Buffer.from('test content'),
        mimetype: 'text/plain',
        size: 12,
      }
      const uploader = { id: 'user-1', username: 'testuser' }

      // Test various valid categories
      const validCategories = ['avatar', 'attachment', 'image', 'document', 'my_category', 'my-category', 'category_123']

      for (const category of validCategories) {
        const result = await fileService.upload(mockFile, category, uploader)
        expect(result.category).toBe(category)
      }
    })
  })

  // =============================================================================
  // findAll
  // =============================================================================

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test files
      const em = getOrm().em.fork()
      const now = new Date()

      const files = [
        { id: 'file-1', category: 'avatar', uploaderId: 'user-1' },
        { id: 'file-2', category: 'attachment', uploaderId: 'user-1' },
        { id: 'file-3', category: 'avatar', uploaderId: 'user-2' },
      ]

      for (const f of files) {
        const fileRecord = em.create(FileRecord, {
          id: f.id,
          originalName: `${f.id}.txt`,
          storedName: `${f.id}-stored.txt`,
          extension: '.txt',
          mimeType: 'text/plain',
          size: 100,
          path: `${f.category}/${f.id}.txt`,
          category: f.category,
          uploaderId: f.uploaderId,
          uploaderName: 'testuser',
          refCount: 0,
          description: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        await em.persistAndFlush(fileRecord)
      }
    })

    it('should return file list with total count', async () => {
      const result = await fileService.findAll({})

      expect(result.total).toBe(3)
      expect(result.data.length).toBe(3)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('should filter files by category', async () => {
      const result = await fileService.findAll({ category: 'avatar' })

      expect(result.total).toBe(2)
      expect(result.data.every(f => f.category === 'avatar')).toBe(true)
    })

    it('should filter files by uploaderId', async () => {
      const result = await fileService.findAll({ uploaderId: 'user-1' })

      expect(result.total).toBe(2)
      expect(result.data.every(f => f.uploaderId === 'user-1')).toBe(true)
    })

    it('should filter files by both category and uploaderId', async () => {
      const result = await fileService.findAll({ category: 'avatar', uploaderId: 'user-2' })

      expect(result.total).toBe(1)
      expect(result.data[0].uploaderId).toBe('user-2')
      expect(result.data[0].category).toBe('avatar')
    })

    it('should support pagination', async () => {
      const result = await fileService.findAll({ page: 1, pageSize: 2 })

      expect(result.data.length).toBe(2)
      expect(result.total).toBe(3)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(2)
    })

    it('should exclude soft-deleted files', async () => {
      // Soft delete one file
      const em = getOrm().em.fork()
      const file = await em.findOne(FileRecord, { id: 'file-1' })
      file!.deletedAt = new Date()
      await em.flush()

      const result = await fileService.findAll({})

      expect(result.total).toBe(2)
      expect(result.data.every(f => f.id !== 'file-1')).toBe(true)
    })
  })

  // =============================================================================
  // findOne
  // =============================================================================

  describe('findOne', () => {
    beforeEach(async () => {
      const em = getOrm().em.fork()
      const now = new Date()

      const fileRecord = em.create(FileRecord, {
        id: 'file-find-1',
        originalName: 'find-test.txt',
        storedName: 'find-test-stored.txt',
        extension: '.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'attachment/find-test.txt',
        category: 'attachment',
        uploaderId: 'user-1',
        uploaderName: 'testuser',
        refCount: 0,
        description: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      await em.persistAndFlush(fileRecord)
    })

    it('should return file info for existing file', async () => {
      const result = await fileService.findOne('file-find-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('file-find-1')
      expect(result!.originalName).toBe('find-test.txt')
      expect(result!.url).toContain('/uploads/attachment/')
    })

    it('should return null for non-existent file', async () => {
      const result = await fileService.findOne('non-existent-id')

      expect(result).toBeNull()
    })

    it('should return null for soft-deleted file', async () => {
      const em = getOrm().em.fork()
      const file = await em.findOne(FileRecord, { id: 'file-find-1' })
      file!.deletedAt = new Date()
      await em.flush()

      const result = await fileService.findOne('file-find-1')

      expect(result).toBeNull()
    })
  })

  // =============================================================================
  // getFilePath
  // =============================================================================

  describe('getFilePath', () => {
    beforeEach(async () => {
      const em = getOrm().em.fork()
      const now = new Date()

      const fileRecord = em.create(FileRecord, {
        id: 'file-path-1',
        originalName: 'path-test.txt',
        storedName: 'path-test-stored.txt',
        extension: '.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'attachment/path-test.txt',
        category: 'attachment',
        uploaderId: 'user-1',
        uploaderName: 'testuser',
        refCount: 0,
        description: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      await em.persistAndFlush(fileRecord)
    })

    it('should return file path and stored name', async () => {
      const result = await fileService.getFilePath('file-path-1')

      expect(result).not.toBeNull()
      expect(result!.storedName).toBe('path-test-stored.txt')
      expect(result!.path).toContain('attachment')
      expect(result!.path).toContain('path-test.txt')
    })

    it('should return null for non-existent file', async () => {
      const result = await fileService.getFilePath('non-existent-id')

      expect(result).toBeNull()
    })
  })

  // =============================================================================
  // delete
  // =============================================================================

  describe('delete', () => {
    beforeEach(async () => {
      const em = getOrm().em.fork()
      const now = new Date()

      // Create a file without references
      const fileRecord = em.create(FileRecord, {
        id: 'file-delete-1',
        originalName: 'delete-test.txt',
        storedName: 'delete-test-stored.txt',
        extension: '.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'attachment/delete-test.txt',
        category: 'attachment',
        uploaderId: 'user-1',
        uploaderName: 'testuser',
        refCount: 0,
        description: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      await em.persistAndFlush(fileRecord)
    })

    it('should soft-delete file without references', async () => {
      const result = await fileService.delete('file-delete-1')

      expect(result).toBe(true)
      expect(mockFs.unlinkSync).toHaveBeenCalled()

      // Verify soft delete in database
      const em = getOrm().em.fork()
      const file = await em.findOne(FileRecord, { id: 'file-delete-1' })
      expect(file!.deletedAt).not.toBeNull()
    })

    it('should throw error when deleting file with references (refCount > 0)', async () => {
      // Create a file with references
      const em = getOrm().em.fork()
      const now = new Date()

      const fileRecord = em.create(FileRecord, {
        id: 'file-delete-ref-1',
        originalName: 'delete-ref-test.txt',
        storedName: 'delete-ref-test-stored.txt',
        extension: '.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'attachment/delete-ref-test.txt',
        category: 'attachment',
        uploaderId: 'user-1',
        uploaderName: 'testuser',
        refCount: 5,
        description: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      await em.persistAndFlush(fileRecord)

      await expect(fileService.delete('file-delete-ref-1')).rejects.toThrow('文件被引用，无法删除')
    })

    it('should return false when deleting non-existent file', async () => {
      const result = await fileService.delete('non-existent-id')

      expect(result).toBe(false)
    })
  })

  // =============================================================================
  // incrementRef
  // =============================================================================

  describe('incrementRef', () => {
    beforeEach(async () => {
      const em = getOrm().em.fork()
      const now = new Date()

      const fileRecord = em.create(FileRecord, {
        id: 'file-ref-1',
        originalName: 'ref-test.txt',
        storedName: 'ref-test-stored.txt',
        extension: '.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'attachment/ref-test.txt',
        category: 'attachment',
        uploaderId: 'user-1',
        uploaderName: 'testuser',
        refCount: 0,
        description: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      await em.persistAndFlush(fileRecord)
    })

    it('should increment ref count', async () => {
      await fileService.incrementRef('file-ref-1')

      const em = getOrm().em.fork()
      const file = await em.findOne(FileRecord, { id: 'file-ref-1' })
      expect(file!.refCount).toBe(1)
    })

    it('should increment ref count multiple times', async () => {
      await fileService.incrementRef('file-ref-1')
      await fileService.incrementRef('file-ref-1')
      await fileService.incrementRef('file-ref-1')

      const em = getOrm().em.fork()
      const file = await em.findOne(FileRecord, { id: 'file-ref-1' })
      expect(file!.refCount).toBe(3)
    })

    it('should do nothing for non-existent file', async () => {
      await fileService.incrementRef('non-existent-id')
      // Should not throw
    })
  })

  // =============================================================================
  // decrementRef
  // =============================================================================

  describe('decrementRef', () => {
    beforeEach(async () => {
      const em = getOrm().em.fork()
      const now = new Date()

      const fileRecord = em.create(FileRecord, {
        id: 'file-decrement-1',
        originalName: 'decrement-test.txt',
        storedName: 'decrement-test-stored.txt',
        extension: '.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'attachment/decrement-test.txt',
        category: 'attachment',
        uploaderId: 'user-1',
        uploaderName: 'testuser',
        refCount: 5,
        description: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      await em.persistAndFlush(fileRecord)
    })

    it('should decrement ref count', async () => {
      await fileService.decrementRef('file-decrement-1')

      const em = getOrm().em.fork()
      const file = await em.findOne(FileRecord, { id: 'file-decrement-1' })
      expect(file!.refCount).toBe(4)
    })

    it('should not decrement below zero', async () => {
      // Set refCount to 0
      const em = getOrm().em.fork()
      const file = await em.findOne(FileRecord, { id: 'file-decrement-1' })
      file!.refCount = 0
      await em.flush()

      await fileService.decrementRef('file-decrement-1')

      const refreshed = await em.findOne(FileRecord, { id: 'file-decrement-1' })
      expect(refreshed!.refCount).toBe(0)
    })

    it('should do nothing for non-existent file', async () => {
      await fileService.decrementRef('non-existent-id')
      // Should not throw
    })
  })
})
