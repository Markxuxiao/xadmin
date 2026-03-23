import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common'
import { UserService } from './user.service'
import { AuthGuard } from './auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    const users = this.userService.findAll()
    return { success: true, data: users }
  }

  @Get('me')
  async getCurrentUser(@Req() req: any) {
    return { success: true, data: req.user }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = this.userService.findOne(id)
    if (!user) {
      return { success: false, message: '用户不存在' }
    }
    return { success: true, data: user }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() data: any) {
    const user = await this.userService.create(data)
    return { success: true, data: user }
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
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
  async delete(@Param('id') id: string) {
    const deleted = this.userService.delete(id)
    return { success: deleted }
  }
}
