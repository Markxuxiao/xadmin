import { Controller, Get, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AppService } from '../shared/app.service'

@ApiTags('menu')
@ApiBearerAuth('JWT-auth')
@Controller('menu')
export class MenuController {
  constructor(private readonly appService: AppService) {}

  @Get('tree')
  @ApiOperation({ summary: '获取菜单树' })
  async getMenuTree(@Req() req: any) {
    // Get user roles from request (set by AuthGuard after JWT validation)
    const userRoles: string[] = req.user?.roles ?? []

    // If no roles, return empty menu
    if (userRoles.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    // Get filtered menu tree based on user roles
    const menus = await this.appService.getMenuTreeByRoles(userRoles)
    return {
      success: true,
      data: menus,
    }
  }
}
