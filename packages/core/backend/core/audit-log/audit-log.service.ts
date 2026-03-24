import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { getOrm, AuditLog } from '../../base'

@Injectable()
export class AuditLogService {
  async findAll(params: {
    action?: string
    entity?: string
    operatorId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }) {
    const em = getOrm().em.fork()
    const where: any = {}

    if (params.action) where.action = params.action
    if (params.entity) where.entity = params.entity
    if (params.operatorId) where.operatorId = params.operatorId
    if (params.startDate || params.endDate) {
      where.createdAt = {}
      if (params.startDate) where.createdAt.$gte = new Date(params.startDate)
      if (params.endDate) where.createdAt.$lte = new Date(params.endDate)
    }

    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const offset = (page - 1) * pageSize

    const [logs, total] = await em.findAndCount(AuditLog, where, {
      filters: ['soft-delete'],
      orderBy: { createdAt: 'DESC' },
      limit: pageSize,
      offset,
    })

    return {
      data: logs.map(l => this.auditLogToRow(l)),
      total,
      page,
      pageSize,
    }
  }

  async findOne(id: string) {
    const em = getOrm().em.fork()
    const log = await em.findOne(AuditLog, { id })
    return log ? this.auditLogToRow(log) : null
  }

  async create(data: {
    action: string
    entity: string
    entityId?: string
    operatorId: string
    operatorName: string
    path: string
    method: string
    requestBody?: any
    statusCode: number
    responseBody?: any
    ip?: string
    userAgent?: string
    error?: string
    description?: string
  }) {
    const em = getOrm().em.fork()
    const now = new Date()

    const log = em.create(AuditLog, {
      id: crypto.randomUUID(),
      action: data.action,
      entity: data.entity,
      entityId: data.entityId || null,
      operatorId: data.operatorId,
      operatorName: data.operatorName,
      path: data.path,
      method: data.method,
      requestBody: data.requestBody ? JSON.stringify(data.requestBody) : null,
      statusCode: data.statusCode,
      responseBody: data.responseBody ? JSON.stringify(data.responseBody).substring(0, 2000) : null,
      ip: data.ip || null,
      userAgent: data.userAgent || null,
      error: data.error || null,
      description: data.description || null,
      createdAt: now,
      deletedAt: null,
    })

    await em.persistAndFlush(log)
    return this.auditLogToRow(log)
  }

  async delete(id: string) {
    const em = getOrm().em.fork()
    const log = await em.findOne(AuditLog, { id })
    if (!log) return false
    log.deletedAt = new Date()
    await em.flush()
    return true
  }

  private auditLogToRow(log: AuditLog) {
    return {
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      operatorId: log.operatorId,
      operatorName: log.operatorName,
      path: log.path,
      method: log.method,
      requestBody: log.requestBody ? JSON.parse(log.requestBody) : null,
      statusCode: log.statusCode,
      responseBody: log.responseBody,
      ip: log.ip,
      userAgent: log.userAgent,
      error: log.error,
      description: log.description,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
    }
  }
}
