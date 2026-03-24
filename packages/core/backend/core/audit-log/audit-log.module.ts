import { Module } from '@nestjs/common'
import { AuditLogController } from './audit-log.controller'
import { AuditLogService } from './audit-log.service'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { AuditInterceptor } from '../../base/interceptors/audit.interceptor'

@Module({
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditLogService],
})
export class AuditLogModule {}
