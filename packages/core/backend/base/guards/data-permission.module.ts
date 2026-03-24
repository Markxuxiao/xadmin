import { Module } from '@nestjs/common'
import { DataPermissionService } from './data-permission.service'
import { DataPermissionGuard } from './data-permission.guard'
import { Reflector } from '@nestjs/core'

@Module({
  providers: [DataPermissionService, DataPermissionGuard, Reflector],
  exports: [DataPermissionService, DataPermissionGuard],
})
export class DataPermissionModule {}
