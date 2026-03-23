import { Module } from '@nestjs/common'
import { AuthModule, UserModule, RoleModule, MenuModule, SharedModule } from '../../../packages/core/backend'

@Module({
  imports: [SharedModule, AuthModule, MenuModule, UserModule, RoleModule],
  exports: [SharedModule],
})
export class AppModule {}
