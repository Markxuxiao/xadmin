import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { RoleService } from './role.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'

@Controller('role')
@UseGuards(AuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  async findAll() {
    const roles = this.roleService.findAll()
    return { success: true, data: roles }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const role = this.roleService.findOne(id)
    if (!role) {
      return { success: false, message: '角色不存在' }
    }
    return { success: true, data: role }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() data: any) {
    // Check if code already exists
    const existing = this.roleService.findByCode(data.code)
    if (existing) {
      return { success: false, message: '角色代码已存在' }
    }
    try {
      const role = await this.roleService.create(data)
      return { success: true, data: role }
    } catch (err: any) {
      // Handle UNIQUE constraint violation from concurrent requests
      if (err.message?.includes('UNIQUE') || err.code === 'SQLITE_CONSTRAINT') {
        return { success: false, message: '角色代码已存在' }
      }
      throw err
    }
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() data: any) {
    // Check if code conflicts with another role
    if (data.code) {
      const existing = this.roleService.findByCode(data.code)
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
  async delete(@Param('id') id: string) {
    const result = this.roleService.delete(id)
    return result
  }
}
