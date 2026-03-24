import { Controller, Get, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { MenuService } from './menu.service'

@ApiTags('menu')
@ApiBearerAuth('JWT-auth')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('tree')
  @ApiOperation({ summary: '获取菜单树' })
  async getMenuTree(@Req() req: any) {
    const userRoles: string[] = req.user?.roles ?? []

    if (userRoles.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    const menus = await this.menuService.getMenuTreeByRoles(userRoles)
    return {
      success: true,
      data: menus,
    }
  }
}
