import { Module } from '@nestjs/common'
import { MenuPermissionController } from './menu-permission.controller'
import { MenuPermissionService } from './menu-permission.service'

@Module({
  controllers: [MenuPermissionController],
  providers: [MenuPermissionService],
  exports: [MenuPermissionService],
})
export class MenuPermissionModule {}
