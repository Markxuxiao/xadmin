import { registerTaskHandler } from './task-executor'
import { getOrm } from '../../base/database'
import { AuditLog } from '../../base/entities/audit-log.entity'
import { User } from '../../base/entities/user.entity'

/**
 * 内置任务：清理 7 天前的操作日志
 */
async function cleanOldAuditLogs(): Promise<void> {
  const em = getOrm().em.fork()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const result = await em.nativeUpdate(
    AuditLog,
    { createdAt: { $lt: sevenDaysAgo } },
    { deletedAt: new Date() }
  )

  console.log(`[BuiltInTasks] Cleaned ${result} old audit logs (before ${sevenDaysAgo.toISOString()})`)
}

/**
 * 内置任务：统计每日用户活跃
 */
async function countDailyUserActivity(): Promise<void> {
  const em = getOrm().em.fork()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // 统计今天活跃的用户数量
  const activeUsers = await em.count(AuditLog, {
    createdAt: { $gte: today, $lt: tomorrow },
    action: { $ne: 'login' }, // 排除纯登录操作
  })

  // 统计今天登录的用户数量
  const loginUsers = await em.count(AuditLog, {
    createdAt: { $gte: today, $lt: tomorrow },
    action: 'login',
  })

  // 获取今天新注册的用户数量
  const newUsers = await em.count(User, {
    createdAt: { $gte: today, $lt: tomorrow },
  })

  console.log(`[BuiltInTasks] Daily User Activity Report (${today.toISOString().split('T')[0]}):`)
  console.log(`  - Active users (non-login): ${activeUsers}`)
  console.log(`  - Login events: ${loginUsers}`)
  console.log(`  - New registrations: ${newUsers}`)

  // TODO: 可以将统计数据存储到专门的分析表中
}

/**
 * 注册所有内置任务处理器
 */
export function registerBuiltinTaskHandlers(): void {
  registerTaskHandler('clean-old-audit-logs', cleanOldAuditLogs)
  registerTaskHandler('count-daily-user-activity', countDailyUserActivity)
  console.log('[BuiltInTasks] Registered 2 built-in task handlers')
}
