import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DictService } from './dict.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'

@ApiTags('dict')
@ApiBearerAuth('JWT-auth')
@Controller('dict')
@UseGuards(AuthGuard)
export class DictController {
  constructor(private readonly dictService: DictService) {}

  @Get()
  @ApiOperation({ summary: '获取字典列表' })
  async findAll(@Query('type') type?: string) {
    const dicts = await this.dictService.findAll(type)
    return { success: true, data: dicts }
  }

  @Get('items/:code')
  @ApiOperation({ summary: '获取字典项' })
  async getItems(@Param('code') code: string) {
    const items = await this.dictService.getItems(code)
    return { success: true, data: items }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个字典' })
  async findOne(@Param('id') id: string) {
    const dict = await this.dictService.findOne(id)
    if (!dict) {
      return { success: false, message: '字典不存在' }
    }
    return { success: true, data: dict }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '创建字典' })
  async create(@Body() data: any) {
    const existing = await this.dictService.findByCode(data.code)
    if (existing) {
      return { success: false, message: '字典编码已存在' }
    }
    try {
      const dict = await this.dictService.create(data)
      return { success: true, data: dict }
    } catch (err: any) {
      if (err.message?.includes('unique') || err.code === '23505') {
        return { success: false, message: '字典编码已存在' }
      }
      throw err
    }
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新字典' })
  async update(@Param('id') id: string, @Body() data: any) {
    if (data.code) {
      const existing = await this.dictService.findByCode(data.code)
      if (existing && existing.id !== id) {
        return { success: false, message: '字典编码已存在' }
      }
    }
    const dict = await this.dictService.update(id, data)
    if (!dict) {
      return { success: false, message: '字典不存在' }
    }
    return { success: true, data: dict }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '删除字典' })
  async delete(@Param('id') id: string) {
    const deleted = await this.dictService.delete(id)
    return { success: deleted }
  }
}
