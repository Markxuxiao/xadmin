import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { getOrm, FileRecord } from '../../base'

// 存储配置
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const BASE_URL = process.env.UPLOAD_BASE_URL || '/uploads'

@Injectable()
export class FileService {
  /**
   * 上传文件
   */
  async upload(file: {
    originalname: string
    buffer: Buffer
    mimetype: string
    size: number
  }, category: string = 'attachment', uploader: { id: string; username: string }) {
    const em = getOrm().em.fork()
    const now = new Date()

    // 生成唯一文件名
    const ext = path.extname(file.originalname).toLowerCase()
    const storedName = `${crypto.randomUUID()}${ext}`
    const relativePath = `${category}/${storedName}`
    const fullPath = path.join(UPLOAD_DIR, category, storedName)

    // 确保目录存在
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // 写入文件
    fs.writeFileSync(fullPath, file.buffer)

    // 保存元数据
    const fileRecord = em.create(FileRecord, {
      id: crypto.randomUUID(),
      originalName: file.originalname,
      storedName,
      extension: ext,
      mimeType: file.mimetype,
      size: file.size,
      path: relativePath,
      category,
      uploaderId: uploader.id,
      uploaderName: uploader.username,
      refCount: 0,
      description: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    await em.persistAndFlush(fileRecord)

    return {
      ...this.fileToRow(fileRecord),
      url: `${BASE_URL}/${relativePath}`,
    }
  }

  /**
   * 获取文件列表
   */
  async findAll(params: {
    category?: string
    uploaderId?: string
    page?: number
    pageSize?: number
  }) {
    const em = getOrm().em.fork()
    const where: any = {}

    if (params.category) where.category = params.category
    if (params.uploaderId) where.uploaderId = params.uploaderId

    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const offset = (page - 1) * pageSize

    const [files, total] = await em.findAndCount(FileRecord, where, {
      filter: ['soft-delete'],
      orderBy: { createdAt: 'DESC' },
      limit: pageSize,
      offset,
    })

    return {
      data: files.map(f => ({
        ...this.fileToRow(f),
        url: `${BASE_URL}/${f.path}`,
      })),
      total,
      page,
      pageSize,
    }
  }

  /**
   * 获取单个文件
   */
  async findOne(id: string) {
    const em = getOrm().em.fork()
    const file = await em.findOne(FileRecord, { id })
    if (!file) return null
    return {
      ...this.fileToRow(file),
      url: `${BASE_URL}/${file.path}`,
    }
  }

  /**
   * 获取文件路径
   */
  async getFilePath(id: string): Promise<{ path: string; storedName: string } | null> {
    const file = await this.findOne(id)
    if (!file) return null
    return {
      path: path.join(UPLOAD_DIR, file.path),
      storedName: file.storedName,
    }
  }

  /**
   * 软删除文件
   */
  async delete(id: string) {
    const em = getOrm().em.fork()
    const file = await em.findOne(FileRecord, { id })
    if (!file) return false

    // 如果有引用，不能删除
    if (file.refCount > 0) {
      throw new Error('文件被引用，无法删除')
    }

    file.deletedAt = new Date()
    await em.flush()

    // 删除物理文件
    const fullPath = path.join(UPLOAD_DIR, file.path)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }

    return true
  }

  /**
   * 增加引用计数
   */
  async incrementRef(id: string) {
    const em = getOrm().em.fork()
    const file = await em.findOne(FileRecord, { id })
    if (file) {
      file.refCount++
      await em.flush()
    }
  }

  /**
   * 减少引用计数
   */
  async decrementRef(id: string) {
    const em = getOrm().em.fork()
    const file = await em.findOne(FileRecord, { id })
    if (file && file.refCount > 0) {
      file.refCount--
      await em.flush()
    }
  }

  private fileToRow(file: FileRecord) {
    return {
      id: file.id,
      originalName: file.originalName,
      storedName: file.storedName,
      extension: file.extension,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      category: file.category,
      uploaderId: file.uploaderId,
      uploaderName: file.uploaderName,
      refCount: file.refCount,
      description: file.description,
      createdAt: file.createdAt instanceof Date ? file.createdAt.toISOString() : String(file.createdAt),
      updatedAt: file.updatedAt instanceof Date ? file.updatedAt.toISOString() : String(file.updatedAt),
    }
  }
}
