import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { AuthGuard } from './auth.guard'
import { RolesGuard } from '../shared/roles/roles.guard'

@Module({
  controllers: [UserController],
  providers: [UserService, AuthGuard, RolesGuard],
  exports: [UserService, AuthGuard, RolesGuard],
})
export class UserModule {}
