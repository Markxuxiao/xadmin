import { Module } from '@nestjs/common'
import { RoleController } from './role.controller'
import { RoleService } from './role.service'
import { DataPermissionModule } from '../../base/guards/data-permission.module'

// Reflector is global in NestJS but needs to be explicitly available for DI
import { Reflector } from '@nestjs/core'

@Module({
  imports: [DataPermissionModule],
  controllers: [RoleController],
  providers: [RoleService, Reflector],
  exports: [RoleService],
})
export class RoleModule {}
