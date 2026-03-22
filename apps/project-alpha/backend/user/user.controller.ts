import { Controller, Get, Post, Put, Delete, Body, Param, Req, UnauthorizedException } from '@nestjs/common'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    const users = this.userService.findAll()
    return { success: true, data: users }
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
  async create(@Body() data: any) {
    const user = this.userService.create(data)
    return { success: true, data: user }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    const user = this.userService.update(id, data)
    if (!user) {
      return { success: false, message: '用户不存在' }
    }
    return { success: true, data: user }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const deleted = this.userService.delete(id)
    return { success: deleted }
  }

  @Get('me')
  async getCurrentUser(@Req() req: any) {
    const authHeader = req.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token')
    }
    const token = authHeader.slice(7)
    const user = this.userService.getCurrentUser(token)
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token')
    }
    return { success: true, data: user }
  }
}
