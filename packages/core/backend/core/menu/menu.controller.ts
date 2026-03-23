import { Controller, Get, Req } from '@nestjs/common'
import { AppService } from '../shared/app.service'

@Controller('menu')
export class MenuController {
  constructor(private readonly appService: AppService) {}

  @Get('tree')
  getMenuTree(@Req() req: any) {
    // In Phase 2, we validate JWT and return user-specific menus
    // For now, return the static menu tree
    return {
      success: true,
      data: this.appService.getMenuTree(),
    }
  }
}
