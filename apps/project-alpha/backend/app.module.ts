import { Module } from '@nestjs/common'
import { SharedModule, AuthModule, MenuModule, UserModule, RoleModule, DepartmentModule, AuditLogModule } from '../../../packages/core/backend'

@Module({
  imports: [SharedModule, AuthModule, MenuModule, UserModule, RoleModule, DepartmentModule, AuditLogModule],
  exports: [SharedModule],
})
export class AppModule {}
