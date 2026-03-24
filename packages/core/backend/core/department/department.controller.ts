import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DepartmentService } from './department.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'

@ApiTags('department')
@ApiBearerAuth('JWT-auth')
@Controller('department')
@UseGuards(AuthGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get('tree')
  @ApiOperation({ summary: '获取部门树' })
  async findTree() {
    const tree = await this.departmentService.findTree()
    return { success: true, data: tree }
  }

  @Get()
  @ApiOperation({ summary: '获取部门列表' })
  async findAll() {
    const depts = await this.departmentService.findAll()
    return { success: true, data: depts }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个部门' })
  async findOne(@Param('id') id: string) {
    const dept = await this.departmentService.findOne(id)
    if (!dept) {
      return { success: false, message: '部门不存在' }
    }
    return { success: true, data: dept }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '创建部门' })
  async create(@Body() data: any) {
    try {
      const dept = await this.departmentService.create(data)
      return { success: true, data: dept }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新部门' })
  async update(@Param('id') id: string, @Body() data: any) {
    try {
      const dept = await this.departmentService.update(id, data)
      if (!dept) {
        return { success: false, message: '部门不存在' }
      }
      return { success: true, data: dept }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '删除部门' })
  async delete(@Param('id') id: string) {
    try {
      const deleted = await this.departmentService.delete(id)
      return { success: deleted }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}
