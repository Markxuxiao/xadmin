import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { RoleService } from './role.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'
import { DataPermissionGuard } from '../../base/guards/data-permission.guard'
import { DataScope } from '../../base/guards/data-scope.decorator'

@ApiTags('role')
@ApiBearerAuth('JWT-auth')
@Controller('role')
@UseGuards(AuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @UseGuards(DataPermissionGuard)
  @DataScope({ resourceType: 'role', checkFullAccess: false })
  @ApiOperation({ summary: '获取角色列表' })
  async findAll(@Req() req: any) {
    const roles = await this.roleService.findAll(req.dataScopeFilter)
    return { success: true, data: roles }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个角色' })
  async findOne(@Param('id') id: string) {
    const role = await this.roleService.findOne(id)
    if (!role) {
      return { success: false, message: '角色不存在' }
    }
    return { success: true, data: role }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '创建角色' })
  async create(@Body() data: any) {
    // Check if code already exists
    const existing = await this.roleService.findByCode(data.code)
    if (existing) {
      return { success: false, message: '角色代码已存在' }
    }
    try {
      const role = await this.roleService.create(data)
      return { success: true, data: role }
    } catch (err: any) {
      // Handle UNIQUE constraint violation from PostgreSQL
      if (err.message?.includes('unique') || err.code === '23505') {
        return { success: false, message: '角色代码已存在' }
      }
      throw err
    }
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新角色' })
  async update(@Param('id') id: string, @Body() data: any) {
    // Check if code conflicts with another role
    if (data.code) {
      const existing = await this.roleService.findByCode(data.code)
      if (existing && existing.id !== id) {
        return { success: false, message: '角色代码已存在' }
      }
    }
    const role = await this.roleService.update(id, data)
    if (!role) {
      return { success: false, message: '角色不存在' }
    }
    return { success: true, data: role }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '删除角色' })
  async delete(@Param('id') id: string) {
    const result = await this.roleService.delete(id)
    return result
  }
}
