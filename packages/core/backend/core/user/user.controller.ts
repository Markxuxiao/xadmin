import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UserService } from './user.service'
import { AuthGuard } from './auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'
import { DataPermissionGuard } from '../../base/guards/data-permission.guard'
import { DataScope } from '../../base/guards/data-scope.decorator'

@ApiTags('user')
@ApiBearerAuth('JWT-auth')
@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(DataPermissionGuard)
  @DataScope({ resourceType: 'user', checkFullAccess: false })
  @ApiOperation({ summary: '获取用户列表' })
  async findAll(@Req() req: any) {
    const users = await this.userService.findAll(req.dataScopeFilter)
    return { success: true, data: users }
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getCurrentUser(@Req() req: any) {
    return { success: true, data: req.user }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个用户' })
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOne(id)
    if (!user) {
      return { success: false, message: '用户不存在' }
    }
    return { success: true, data: user }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '创建用户' })
  async create(@Body() data: any) {
    const user = await this.userService.create(data)
    return { success: true, data: user }
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新用户' })
  async update(@Param('id') id: string, @Body() data: any) {
    const user = await this.userService.update(id, data)
    if (!user) {
      return { success: false, message: '用户不存在' }
    }
    return { success: true, data: user }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '删除用户' })
  async delete(@Param('id') id: string) {
    const deleted = await this.userService.delete(id)
    return { success: deleted }
  }
}
