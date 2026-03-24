import { Module } from '@nestjs/common'
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Reflector } from '@nestjs/core'

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, AuthGuard, RolesGuard, Reflector],
  exports: [NotificationService],
})
export class NotificationModule {}
