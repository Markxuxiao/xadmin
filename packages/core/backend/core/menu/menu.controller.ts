import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common'
import { MenuService } from './menu.service'

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('tree')
  async getMenuTree() {
    return this.menuService.getMenuTree()
  }

  @Get()
  async findAll() {
    return this.menuService.findAll()
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const menu = await this.menuService.findById(id)
    if (!menu) {
      return { success: false, message: '菜单不存在' }
    }
    return { success: true, data: menu }
  }

  @Post()
  async create(@Body() data: any) {
    try {
      const menu = await this.menuService.create(data)
      return { success: true, data: menu }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    try {
      const menu = await this.menuService.update(id, data)
      return { success: true, data: menu }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      await this.menuService.delete(id)
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}
