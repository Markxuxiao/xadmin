import { Module } from '@nestjs/common'
import { MenuController } from './menu.controller'
import { SharedModule } from '../shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [MenuController],
})
export class MenuModule {}
