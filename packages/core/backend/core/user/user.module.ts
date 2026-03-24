import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { AuthGuard } from './auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { DataPermissionModule } from '../../base/guards/data-permission.module'

// Reflector is global in NestJS but needs to be explicitly available for DI
import { Reflector } from '@nestjs/core'

@Module({
  imports: [DataPermissionModule],
  controllers: [UserController],
  providers: [UserService, AuthGuard, RolesGuard, Reflector],
  exports: [UserService, AuthGuard, RolesGuard, DataPermissionModule],
})
export class UserModule {}
