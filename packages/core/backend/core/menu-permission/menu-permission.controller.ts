import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { MenuPermissionService } from './menu-permission.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'

@Controller('menu-permission')
@UseGuards(AuthGuard)
export class MenuPermissionController {
  constructor(private readonly menuPermissionService: MenuPermissionService) {}

  @Get('role/:roleId')
  async findByRoleId(@Param('roleId') roleId: string) {
    const permissions = await this.menuPermissionService.findByRoleId(roleId)
    return { success: true, data: permissions }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() data: { roleId: string; menuPath: string; action: string }) {
    try {
      const permission = await this.menuPermissionService.create(data)
      return { success: true, data: permission }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  @Delete('role/:roleId/path/:menuPath')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deleteByRoleAndPath(@Param('roleId') roleId: string, @Param('menuPath') menuPath: string) {
    const result = await this.menuPermissionService.deleteByRoleAndPath(roleId, decodeURIComponent(menuPath))
    return result
  }

  @Delete('role/:roleId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deleteByRoleId(@Param('roleId') roleId: string) {
    const result = await this.menuPermissionService.deleteByRoleId(roleId)
    return result
  }

  @Get('check')
  async checkPermission(@Query('roleIds') roleIds: string, @Query('menuPath') menuPath: string) {
    const hasPermission = await this.menuPermissionService.hasMenuPermission(
      roleIds.split(','),
      decodeURIComponent(menuPath),
    )
    return { success: true, data: { hasPermission } }
  }

  @Get('permitted-paths')
  async getPermittedPaths(@Query('roleIds') roleIds: string) {
    const paths = await this.menuPermissionService.getPermittedPaths(roleIds.split(','))
    return { success: true, data: { paths } }
  }
}
