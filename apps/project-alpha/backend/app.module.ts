import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { MenuModule } from './menu/menu.module'
import { UserModule } from './user/user.module'
import { SharedModule } from './shared/shared.module'

@Module({
  imports: [SharedModule, AuthModule, MenuModule, UserModule],
  exports: [SharedModule],
})
export class AppModule {}
