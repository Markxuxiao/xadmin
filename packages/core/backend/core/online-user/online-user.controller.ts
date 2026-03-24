import { Controller, Get, Delete, Post, Param, Body, UseGuards } from '@nestjs/common'
import { OnlineUserService, OnlineUserInfo } from './online-user.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'

class HeartbeatDto {
  token!: string
}

@Controller('online-users')
@UseGuards(AuthGuard)
export class OnlineUserController {
  constructor(private readonly onlineUserService: OnlineUserService) {}

  // GET /online-users - Query all online users
  @Get()
  async findAll() {
    const users = this.onlineUserService.findAll()
    return {
      success: true,
      data: users,
      total: users.length,
    }
  }

  // POST /online-users/heartbeat - Heartbeat to refresh online status
  @Post('heartbeat')
  async heartbeat(@Body() dto: HeartbeatDto) {
    const refreshed = this.onlineUserService.refresh(dto.token)
    return {
      success: refreshed,
      message: refreshed ? '心跳成功' : 'Token 不存在或已过期',
    }
  }

  // DELETE /online-users/:token - Force logout
  @Delete(':token')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async forceLogout(@Param('token') token: string) {
    const removed = this.onlineUserService.remove(token)
    return {
      success: removed,
      message: removed ? '强制下线成功' : '用户不在线',
    }
  }
}
