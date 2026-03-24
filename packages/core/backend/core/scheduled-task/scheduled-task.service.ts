import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { getOrm } from '../../base/database'
import { ScheduledTask, ScheduledTaskRow } from '../../base/entities/scheduled-task.entity'
import { TaskExecutor } from './task-executor'

@Injectable()
export class ScheduledTaskService {
  constructor(private readonly taskExecutor: TaskExecutor) {}

  /**
   * 获取所有任务
   */
  async findAll(params?: {
    enabled?: boolean
    page?: number
    pageSize?: number
  }) {
    const em = getOrm().em.fork()
    const where: any = {}

    if (params?.enabled !== undefined) {
      where.enabled = params.enabled
    }

    const page = params?.page || 1
    const pageSize = params?.pageSize || 20
    const offset = (page - 1) * pageSize

    const [tasks, total] = await em.findAndCount(ScheduledTask, where, {
      filter: ['soft-delete'],
      orderBy: { createdAt: 'DESC' },
      limit: pageSize,
      offset,
    })

    return {
      data: tasks.map(t => this.taskToRow(t)),
      total,
      page,
      pageSize,
    }
  }

  /**
   * 获取单个任务
   */
  async findOne(id: string) {
    const em = getOrm().em.fork()
    const task = await em.findOne(ScheduledTask, { id })
    return task ? this.taskToRow(task) : null
  }

  /**
   * 创建任务
   */
  async create(data: {
    name: string
    description?: string
    cron: string
    handler: string
    enabled?: boolean
    taskParams?: any
  }) {
    const em = getOrm().em.fork()
    const now = new Date()

    const task = em.create(ScheduledTask, {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description || null,
      cron: data.cron,
      handler: data.handler,
      enabled: data.enabled ?? true,
      taskParams: data.taskParams ? JSON.stringify(data.taskParams) : null,
      lastExecutedAt: null,
      lastExecutedResult: null,
      consecutiveFailures: 0,
      isBuiltin: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })

    await em.persistAndFlush(task)

    // 如果任务启用，立即启动
    if (task.enabled) {
      this.taskExecutor.startTask(task)
    }

    return this.taskToRow(task)
  }

  /**
   * 更新任务
   */
  async update(id: string, data: Partial<{
    name: string
    description: string
    cron: string
    handler: string
    enabled: boolean
    taskParams: any
  }>) {
    const em = getOrm().em.fork()
    const task = await em.findOne(ScheduledTask, { id })

    if (!task) return null

    // 内置任务不允许修改某些字段
    if (task.isBuiltin) {
      if (data.cron !== undefined || data.handler !== undefined) {
        throw new Error('Builtin task cron and handler cannot be modified')
      }
    }

    if (data.name !== undefined) { task.name = data.name }
    if (data.description !== undefined) { task.description = data.description }
    if (data.cron !== undefined) { task.cron = data.cron }
    if (data.handler !== undefined) { task.handler = data.handler }
    if (data.enabled !== undefined) { task.enabled = data.enabled }
    if (data.taskParams !== undefined) { task.taskParams = JSON.stringify(data.taskParams) }

    task.updatedAt = new Date()

    await em.flush()

    // 更新任务调度
    if (task.enabled) {
      this.taskExecutor.startTask(task)
    } else {
      this.taskExecutor.stopTask(task.id)
    }

    return this.taskToRow(task)
  }

  /**
   * 删除任务 (软删除)
   */
  async delete(id: string) {
    const em = getOrm().em.fork()
    const task = await em.findOne(ScheduledTask, { id })

    if (!task) return false

    // 内置任务不允许删除
    if (task.isBuiltin) {
      throw new Error('Builtin task cannot be deleted')
    }

    // 停止任务调度
    this.taskExecutor.stopTask(task.id)

    // 软删除
    task.deletedAt = new Date()
    await em.flush()

    return true
  }

  /**
   * 启用任务
   */
  async enable(id: string) {
    return this.update(id, { enabled: true })
  }

  /**
   * 禁用任务
   */
  async disable(id: string) {
    return this.update(id, { enabled: false })
  }

  /**
   * 手动触发任务
   */
  async trigger(id: string) {
    return this.taskExecutor.triggerTask(id)
  }

  /**
   * 获取任务执行状态
   */
  getExecutorStatus() {
    return {
      runningTaskCount: this.taskExecutor.getRunningTaskCount(),
    }
  }

  /**
   * 将任务实体转换为行对象
   */
  private taskToRow(task: ScheduledTask): ScheduledTaskRow {
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      cron: task.cron,
      handler: task.handler,
      enabled: task.enabled,
      lastExecutedAt: task.lastExecutedAt instanceof Date
        ? task.lastExecutedAt.toISOString()
        : task.lastExecutedAt,
      lastExecutedResult: task.lastExecutedResult,
      consecutiveFailures: task.consecutiveFailures,
      isBuiltin: task.isBuiltin,
      taskParams: task.taskParams,
      createdAt: task.createdAt instanceof Date
        ? task.createdAt.toISOString()
        : String(task.createdAt),
      updatedAt: task.updatedAt instanceof Date
        ? task.updatedAt.toISOString()
        : String(task.updatedAt),
    }
  }
}
