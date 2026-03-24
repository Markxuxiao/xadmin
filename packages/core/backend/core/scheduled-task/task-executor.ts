import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import * as cron from 'node-cron'
import { ScheduledTask, ScheduledTaskRow } from '../../base/entities/scheduled-task.entity'
import { getOrm } from '../../base/database'

/**
 * 任务处理器注册表
 */
export type TaskHandler = (params?: any) => Promise<void>

const handlerRegistry: Map<string, TaskHandler> = new Map()

/**
 * 注册任务处理器
 */
export function registerTaskHandler(name: string, handler: TaskHandler): void {
  handlerRegistry.set(name, handler)
}

/**
 * 获取任务处理器
 */
export function getTaskHandler(name: string): TaskHandler | undefined {
  return handlerRegistry.get(name)
}

/**
 * 任务执行器
 * 基于 node-cron 的定时任务调度器
 */
@Injectable()
export class TaskExecutor implements OnModuleInit, OnModuleDestroy {
  /** 正在运行的任务映射: taskId -> cron task */
  private runningTasks: Map<string, cron.ScheduledTask> = new Map()
  /** 正在执行的任务 ID 集合（防止同实例内重叠执行） */
  private executingTasks: Set<string> = new Set()

  constructor() {}

  /**
   * 获取分布式锁（使用 PostgreSQL advisory lock）
   */
  async acquireDistributedLock(taskId: string, ttlMs: number = 30000): Promise<boolean> {
    try {
      const em = getOrm().em.fork()
      // 使用 taskId 的 hash 作为 lock key
      const lockKey = Math.abs(taskId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0))
      const result = await em.execute(`SELECT pg_try_advisory_lock(${lockKey}) as acquired`)
      return result?.[0]?.acquired === true
    } catch {
      return false
    }
  }

  /**
   * 释放分布式锁
   */
  async releaseDistributedLock(taskId: string): Promise<void> {
    try {
      const em = getOrm().em.fork()
      const lockKey = Math.abs(taskId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0))
      await em.execute(`SELECT pg_advisory_unlock(${lockKey})`)
    } catch {
      // ignore
    }
  }

  async onModuleInit() {
    // 启动时加载所有启用的任务
    await this.loadEnabledTasks()
  }

  async onModuleDestroy() {
    // 停止所有任务
    this.stopAllTasks()
  }

  /**
   * 加载所有启用的任务
   */
  async loadEnabledTasks(): Promise<void> {
    const em = getOrm().em.fork()
    const tasks = await em.find(ScheduledTask, { enabled: true }, { filters: ['soft-delete'] })

    for (const task of tasks) {
      this.startTask(task)
    }

    console.log(`[TaskExecutor] Loaded ${tasks.length} enabled scheduled tasks`)
  }

  /**
   * 启动单个任务
   */
  startTask(task: ScheduledTask): boolean {
    // 验证 cron 表达式
    if (!cron.validate(task.cron)) {
      console.error(`[TaskExecutor] Invalid cron expression for task ${task.id}: ${task.cron}`)
      return false
    }

    // 如果任务已在运行，先停止
    if (this.runningTasks.has(task.id)) {
      this.stopTask(task.id)
    }

    // 获取处理器
    const handler = getTaskHandler(task.handler)
    if (!handler) {
      console.error(`[TaskExecutor] Handler not found for task ${task.id}: ${task.handler}`)
      return false
    }

    // 创建并启动 cron 任务
    const scheduledTask = cron.schedule(task.cron, async () => {
      // 防止同实例内重叠执行
      if (this.executingTasks.has(task.id)) {
        console.log(`[TaskExecutor] Task ${task.name} skipped - previous execution still running`)
        return
      }

      // 先尝试获取分布式锁
      const acquired = await this.acquireDistributedLock(task.id)
      if (!acquired) {
        console.log(`[TaskExecutor] Task ${task.name} skipped - another instance is executing`)
        return
      }

      this.executingTasks.add(task.id)
      try {
        await this.executeTask(task)
      } finally {
        await this.releaseDistributedLock(task.id)
        this.executingTasks.delete(task.id)
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai',
    })

    this.runningTasks.set(task.id, scheduledTask)
    console.log(`[TaskExecutor] Started task: ${task.name} (${task.cron})`)
    return true
  }

  /**
   * 停止单个任务
   */
  stopTask(taskId: string): void {
    const scheduledTask = this.runningTasks.get(taskId)
    if (scheduledTask) {
      scheduledTask.stop()
      this.runningTasks.delete(taskId)
      console.log(`[TaskExecutor] Stopped task: ${taskId}`)
    }
  }

  /**
   * 停止所有任务
   */
  stopAllTasks(): void {
    for (const [taskId, task] of this.runningTasks) {
      task.stop()
    }
    this.runningTasks.clear()
    console.log('[TaskExecutor] Stopped all tasks')
  }

  /**
   * 执行任务
   */
  async executeTask(task: ScheduledTask): Promise<{ success: boolean; error?: string }> {
    const handler = getTaskHandler(task.handler)
    if (!handler) {
      return { success: false, error: `Handler not found: ${task.handler}` }
    }

    const maxRetries = task.retryCount ?? 0
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now()
      console.log(`[TaskExecutor] Executing task: ${task.name} (attempt ${attempt + 1})`)

      try {
        // 解析任务参数
        const params = task.taskParams ? JSON.parse(task.taskParams) : undefined

        // 执行处理器
        await handler(params)

        const duration = Date.now() - startTime
        console.log(`[TaskExecutor] Task completed: ${task.name} (${duration}ms)`)

        // 更新任务状态
        await this.updateTaskStatus(task.id, 'success')

        return { success: true }
      } catch (error: any) {
        lastError = error
        const duration = Date.now() - startTime
        console.error(`[TaskExecutor] Task failed: ${task.name} (${duration}ms, attempt ${attempt + 1})`, error?.message)

        if (attempt < maxRetries) {
          const interval = task.retryInterval ?? 1000
          console.log(`[TaskExecutor] Retrying task ${task.name} in ${interval}ms...`)
          await new Promise(r => setTimeout(r, interval))
        }
      }
    }

    // 所有重试都失败了
    await this.updateTaskStatus(task.id, 'failed', lastError?.message)

    return { success: false, error: lastError?.message }
  }

  /**
   * 手动触发任务
   */
  async triggerTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    const em = getOrm().em.fork()
    const task = await em.findOne(ScheduledTask, { id: taskId })

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    return this.executeTask(task)
  }

  /**
   * 更新任务执行状态
   */
  private async updateTaskStatus(taskId: string, result: 'success' | 'failed', error?: string): Promise<void> {
    const em = getOrm().em.fork()
    const task = await em.findOne(ScheduledTask, { id: taskId })

    if (!task) return

    task.lastExecutedAt = new Date()
    task.lastExecutedResult = result

    if (result === 'failed') {
      task.consecutiveFailures += 1
    } else {
      task.consecutiveFailures = 0
    }

    await em.flush()
  }

  /**
   * 获取正在运行的任务数量
   */
  getRunningTaskCount(): number {
    return this.runningTasks.size
  }

  /**
   * 检查任务是否在运行
   */
  isTaskRunning(taskId: string): boolean {
    return this.runningTasks.has(taskId)
  }
}
