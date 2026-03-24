import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { AuditLogService } from '../../core/audit-log/audit-log.service'
import { UserService } from '../../core/user/user.service'

/**
 * 审计拦截器 — 自动记录所有 API 请求
 *
 * 使用方式：在需要审计的 Controller 上添加 @UseInterceptors(AuditInterceptor)
 *
 * 注意：需要 UserService 来获取当前用户信息，所以这里只是记录操作，
 * 用户信息从请求中获取（AuthGuard 已将用户信息注入 req.user）
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const { method, url, body, headers } = request
    const user = request.user || { id: 'anonymous', username: '匿名用户' }

    // 从路径提取实体类型，如 /user -> User
    const entity = this.extractEntity(url)
    // 映射 HTTP 方法到操作类型
    const action = this.methodToAction(method)

    // 提取实体 ID (如果是 /entity/:id 格式)
    const entityId = this.extractEntityId(url)

    const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || request.ip || request.connection?.remoteAddress
    const userAgent = headers['user-agent']

    const logData = {
      action,
      entity,
      entityId,
      operatorId: user.id || 'unknown',
      operatorName: user.username || 'unknown',
      path: url,
      method,
      requestBody: body,
      statusCode: 0,
      ip,
      userAgent,
    }

    const startTime = Date.now()

    return next.handle().pipe(
      tap((responseBody) => {
        // 成功响应
        const statusCode = responseBody?.statusCode || 200
        this.auditLogService.create({
          ...logData,
          statusCode,
          responseBody: typeof responseBody === 'object' ? { success: responseBody.success } : undefined,
          description: this.generateDescription(action, entity, user.username),
        }).catch((err) => {
          console.error('[AuditInterceptor] Failed to create log:', err)
        })
      }),
      catchError((error) => {
        // 错误响应
        const statusCode = error.status || error.response?.status || 500
        this.auditLogService.create({
          ...logData,
          statusCode,
          error: error.message,
          description: this.generateDescription(action, entity, user.username) + ' (失败)',
        }).catch((err) => {
          console.error('[AuditInterceptor] Failed to create error log:', err)
        })
        return throwError(() => error)
      })
    )
  }

  private extractEntity(url: string): string {
    // 从 /api/user/123 -> user
    // 从 /api/system/dict -> system-dict
    const match = url.match(/\/api\/([^/]+)/)
    if (match) {
      const entity = match[1]
      // 转换为 PascalCase
      return entity
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
    }
    return 'Unknown'
  }

  private extractEntityId(url: string): string | undefined {
    const match = url.match(/\/api\/[^/]+\/([^/]+)/)
    return match?.[1]
  }

  private methodToAction(method: string): string {
    const map: Record<string, string> = {
      GET: 'query',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    }
    return map[method.toUpperCase()] || 'query'
  }

  private generateDescription(action: string, entity: string, username: string): string {
    const actionMap: Record<string, string> = {
      create: '创建',
      update: '更新',
      delete: '删除',
      query: '查询',
    }
    return `${username} ${actionMap[action] || action}了${entity}`
  }
}
