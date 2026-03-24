import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { ScheduledTaskService } from '../core/scheduled-task/scheduled-task.service'
import { TaskExecutor, registerTaskHandler } from '../core/scheduled-task/task-executor'
import { registerBuiltinTaskHandlers } from '../core/scheduled-task/built-in-tasks'
import { createTestOrm, closeTestOrm, getOrm } from './helpers/test-db'
import { ScheduledTask } from '../base/entities/scheduled-task.entity'
import { AuditLog } from '../base/entities/audit-log.entity'

describe('ScheduledTaskService — CRUD', () => {
  let taskService: ScheduledTaskService
  // Keep a reference to the latest executor for afterAll cleanup
  let latestExecutor: TaskExecutor

  beforeAll(async () => {
    await createTestOrm()
    // Register built-in task handlers before tests run
    registerBuiltinTaskHandlers()
  })

  beforeEach(() => {
    const taskExecutor = new TaskExecutor()
    latestExecutor = taskExecutor
    taskService = new ScheduledTaskService(taskExecutor)
  })

  afterAll(async () => {
    // Stop all running tasks to avoid leaks
    latestExecutor?.stopAllTasks()
    await closeTestOrm()
  })

  // -------------------------------------------------------------------------
  // findAll / findOne
  // -------------------------------------------------------------------------

  it('should find all tasks (includes built-in)', async () => {
    const result = await taskService.findAll()
    expect(result.total).toBeGreaterThanOrEqual(2)
    expect(result.data.length).toBeGreaterThanOrEqual(2)
    // Default tasks are seeded: clean-old-audit-logs and count-daily-user-activity
    const names = result.data.map(t => t.name)
    expect(names).toContain('清理7天前操作日志')
    expect(names).toContain('统计每日用户活跃')
  })

  it('should find all tasks with pagination', async () => {
    const result = await taskService.findAll({ page: 1, pageSize: 1 })
    expect(result.data.length).toBe(1)
    expect(result.total).toBeGreaterThanOrEqual(2)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(1)
  })

  it('should filter tasks by enabled status', async () => {
    // clean-old-audit-logs is enabled, count-daily-user-activity is disabled
    const enabled = await taskService.findAll({ enabled: true })
    expect(enabled.data.every(t => t.enabled)).toBe(true)

    const disabled = await taskService.findAll({ enabled: false })
    expect(disabled.data.every(t => !t.enabled)).toBe(true)
  })

  it('should find task by id', async () => {
    const all = await taskService.findAll()
    const first = all.data[0]

    const found = await taskService.findOne(first.id)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(first.id)
    expect(found!.name).toBe(first.name)
  })

  it('should return null for non-existent id', async () => {
    const found = await taskService.findOne('00000000-0000-0000-0000-000000000999')
    expect(found).toBeNull()
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  it('should create a new task with all fields', async () => {
    const task = await taskService.create({
      name: 'My Test Task',
      description: 'A test task',
      cron: '0 0 * * *',
      handler: 'clean-old-audit-logs',
      enabled: true,
      taskParams: { days: 30 },
    })

    expect(task).not.toBeNull()
    expect(task.name).toBe('My Test Task')
    expect(task.description).toBe('A test task')
    expect(task.cron).toBe('0 0 * * *')
    expect(task.handler).toBe('clean-old-audit-logs')
    expect(task.enabled).toBe(true)
    expect(task.isBuiltin).toBe(false)
    expect(task.taskParams).toBe('{"days":30}')
    expect(task.consecutiveFailures).toBe(0)
    expect(task.lastExecutedAt).toBeNull()
    expect(task.lastExecutedResult).toBeNull()
  })

  it('should create a disabled task', async () => {
    const task = await taskService.create({
      name: 'Disabled Task',
      cron: '0 0 * * *',
      handler: 'clean-old-audit-logs',
      enabled: false,
    })

    expect(task).not.toBeNull()
    expect(task.enabled).toBe(false)
  })

  it('should create task with minimal fields (enabled defaults to true)', async () => {
    const task = await taskService.create({
      name: 'Minimal Task',
      cron: '0 0 * * *',
      handler: 'clean-old-audit-logs',
    })

    expect(task).not.toBeNull()
    expect(task.enabled).toBe(true)
    expect(task.description).toBeNull()
    expect(task.taskParams).toBeNull()
  })

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  it('should update task fields', async () => {
    const created = await taskService.create({
      name: 'To Update',
      cron: '0 0 * * *',
      handler: 'clean-old-audit-logs',
      enabled: false,
    })

    const updated = await taskService.update(created!.id, {
      name: 'Updated Name',
      description: 'New description',
      cron: '0 1 * * *',
    })

    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('Updated Name')
    expect(updated!.description).toBe('New description')
    expect(updated!.cron).toBe('0 1 * * *')
  })

  it('should return null when updating non-existent task', async () => {
    const result = await taskService.update('00000000-0000-0000-0000-000000000999', { name: 'Test' })
    expect(result).toBeNull()
  })

  it('should prevent modification of cron and handler for built-in tasks', async () => {
    const all = await taskService.findAll()
    const builtin = all.data.find(t => t.isBuiltin)!
    // cron and handler are the protected fields for built-in tasks
    await expect(taskService.update(builtin.id, { cron: '0 3 * * *' })).rejects.toThrow(
      'Builtin task cron and handler cannot be modified'
    )
  })

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  it('should soft-delete a non-builtin task', async () => {
    const created = await taskService.create({
      name: 'To Delete',
      cron: '0 0 * * *',
      handler: 'clean-old-audit-logs',
    })

    const result = await taskService.delete(created!.id)
    expect(result).toBe(true)

    // Use a fresh entity manager to verify deletedAt is set (soft-delete)
    const em = getOrm().em.fork()
    const task = await em.findOne(ScheduledTask, { id: created!.id })
    expect(task).not.toBeNull()
    expect(task!.deletedAt).not.toBeNull()
  })

  it('should return false when deleting non-existent task', async () => {
    const result = await taskService.delete('00000000-0000-0000-0000-000000000999')
    expect(result).toBe(false)
  })

  it('should throw when attempting to delete a built-in task', async () => {
    const all = await taskService.findAll()
    const builtin = all.data.find(t => t.isBuiltin)!

    await expect(taskService.delete(builtin.id)).rejects.toThrow('Builtin task cannot be deleted')
  })

  // -------------------------------------------------------------------------
  // enable / disable
  // -------------------------------------------------------------------------

  it('should enable a disabled task', async () => {
    const created = await taskService.create({
      name: 'To Enable',
      cron: '0 0 * * *',
      handler: 'clean-old-audit-logs',
      enabled: false,
    })

    const enabled = await taskService.enable(created!.id)
    expect(enabled).not.toBeNull()
    expect(enabled!.enabled).toBe(true)
  })

  it('should disable an enabled task', async () => {
    const created = await taskService.create({
      name: 'To Disable',
      cron: '0 0 * * *',
      handler: 'clean-old-audit-logs',
      enabled: true,
    })

    const disabled = await taskService.disable(created!.id)
    expect(disabled).not.toBeNull()
    expect(disabled!.enabled).toBe(false)
  })

  it('should return null when enabling non-existent task', async () => {
    const result = await taskService.enable('00000000-0000-0000-0000-000000000999')
    expect(result).toBeNull()
  })

  // -------------------------------------------------------------------------
  // trigger
  // -------------------------------------------------------------------------

  it('should trigger a task and return success', async () => {
    // Register a simple echo handler for this test
    let echoCalled = false
    registerTaskHandler('test-echo', async () => {
      echoCalled = true
    })

    const created = await taskService.create({
      name: 'Echo Task',
      cron: '0 0 * * *',
      handler: 'test-echo',
      enabled: false,
    })

    const result = await taskService.trigger(created!.id)
    expect(result.success).toBe(true)
    expect(echoCalled).toBe(true)
  })

  it('should trigger a task and return failure when handler throws', async () => {
    registerTaskHandler('test-fail', async () => {
      throw new Error('Intentional failure')
    })

    const created = await taskService.create({
      name: 'Failing Task',
      cron: '0 0 * * *',
      handler: 'test-fail',
      enabled: false,
    })

    const result = await taskService.trigger(created!.id)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Intentional failure')
  })

  it('should return failure when triggering non-existent task', async () => {
    const result = await taskService.trigger('00000000-0000-0000-0000-000000000999')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Task not found')
  })

  // -------------------------------------------------------------------------
  // getExecutorStatus
  // -------------------------------------------------------------------------

  it('should return executor status', async () => {
    const status = taskService.getExecutorStatus()
    expect(status.runningTaskCount).toBeGreaterThanOrEqual(0)
  })
})

describe('TaskExecutor — built-in task execution', () => {
  let taskExecutor: TaskExecutor
  let latestExecutor: TaskExecutor

  beforeAll(async () => {
    await createTestOrm()
    registerBuiltinTaskHandlers()
  })

  beforeEach(() => {
    taskExecutor = new TaskExecutor()
    latestExecutor = taskExecutor
  })

  afterAll(async () => {
    latestExecutor?.stopAllTasks()
    await closeTestOrm()
  })

  it('should execute clean-old-audit-logs handler successfully', async () => {
    const em = getOrm().em.fork()
    const now = new Date()

    // Create an old audit log (10 days ago)
    const oldDate = new Date(now)
    oldDate.setDate(oldDate.getDate() - 10)

    const oldLog = em.create(AuditLog, {
      id: 'e0000000-0000-0000-0000-000000000001',
      action: 'update',
      entity: 'User',
      entityId: '1',
      operatorId: 'admin',
      operatorName: 'admin',
      path: '/users/1',
      method: 'PUT',
      statusCode: 200,
      createdAt: oldDate,
      deletedAt: null,
    })
    await em.persistAndFlush(oldLog)

    // Create a recent audit log (should NOT be deleted)
    const recentLog = em.create(AuditLog, {
      id: 'e0000000-0000-0000-0000-000000000002',
      action: 'update',
      entity: 'User',
      entityId: '2',
      operatorId: 'admin',
      operatorName: 'admin',
      path: '/users/2',
      method: 'PUT',
      statusCode: 200,
      createdAt: now,
      deletedAt: null,
    })
    await em.persistAndFlush(recentLog)

    // Get the built-in clean-old-audit-logs task
    const tasks = await em.find(ScheduledTask, { handler: 'clean-old-audit-logs' })
    expect(tasks.length).toBeGreaterThan(0)
    const cleanTask = tasks[0]

    // Execute the task
    const result = await taskExecutor.executeTask(cleanTask)
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()

    // Verify old log was soft-deleted
    await em.refresh(oldLog)
    expect(oldLog.deletedAt).not.toBeNull()

    // Verify recent log was NOT touched
    await em.refresh(recentLog)
    expect(recentLog.deletedAt).toBeNull()
  })

  it('should mark consecutive failures when task throws', async () => {
    const em = getOrm().em.fork()
    const now = new Date()

    // Create a custom failing task
    registerTaskHandler('test-consecutive-fail', async () => {
      throw new Error('Fail again')
    })

    const failingTask = em.create(ScheduledTask, {
      id: 'f0000000-0000-0000-0000-000000000001',
      name: 'Failing Task',
      description: null,
      cron: '0 0 * * *',
      handler: 'test-consecutive-fail',
      enabled: false,
      lastExecutedAt: null,
      lastExecutedResult: null,
      consecutiveFailures: 0,
      isBuiltin: false,
      taskParams: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })
    await em.persistAndFlush(failingTask)

    const result = await taskExecutor.executeTask(failingTask)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Fail again')

    // Refresh and check consecutive failures was incremented
    await em.refresh(failingTask)
    expect(failingTask.consecutiveFailures).toBe(1)
    expect(failingTask.lastExecutedResult).toBe('failed')
  })

  it('should reset consecutive failures on success', async () => {
    const em = getOrm().em.fork()
    const now = new Date()

    // Create a custom task that succeeds
    registerTaskHandler('test-success-reset', async () => {
      // no-op
    })

    const successTask = em.create(ScheduledTask, {
      id: 'f0000000-0000-0000-0000-000000000002',
      name: 'Success Task',
      description: null,
      cron: '0 0 * * *',
      handler: 'test-success-reset',
      enabled: false,
      lastExecutedAt: null,
      lastExecutedResult: 'failed', // pre-set to failed
      consecutiveFailures: 3,
      isBuiltin: false,
      taskParams: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })
    await em.persistAndFlush(successTask)

    const result = await taskExecutor.executeTask(successTask)
    expect(result.success).toBe(true)

    // Refresh and verify failures were reset
    await em.refresh(successTask)
    expect(successTask.consecutiveFailures).toBe(0)
    expect(successTask.lastExecutedResult).toBe('success')
  })

  it('should return failure when handler is not found', async () => {
    const em = getOrm().em.fork()
    const now = new Date()

    const unknownTask = em.create(ScheduledTask, {
      id: 'f0000000-0000-0000-0000-000000000003',
      name: 'Unknown Handler Task',
      description: null,
      cron: '0 0 * * *',
      handler: 'non-existent-handler',
      enabled: false,
      lastExecutedAt: null,
      lastExecutedResult: null,
      consecutiveFailures: 0,
      isBuiltin: false,
      taskParams: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    })
    await em.persistAndFlush(unknownTask)

    const result = await taskExecutor.executeTask(unknownTask)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Handler not found: non-existent-handler')
  })
})
