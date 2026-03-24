import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common'
import { NotificationService, SendNotificationDto } from './notification.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'

@Controller('notification')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * 获取当前用户的通知列表
   */
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('type') type?: string,
    @Query('isRead') isRead?: string,
  ) {
    const userId = req.user.id
    const params: any = { page, pageSize }
    if (type) params.type = type
    if (isRead !== undefined) params.isRead = isRead === 'true'

    const result = await this.notificationService.findByUser(userId, params)
    return { success: true, ...result }
  }

  /**
   * 获取未读通知数量
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.id)
    return { success: true, data: count }
  }

  /**
   * 获取单个通知
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const notification = await this.notificationService.findOne(id, req.user.id)
    if (!notification) {
      return { success: false, message: '通知不存在' }
    }
    return { success: true, data: notification }
  }

  /**
   * 发送通知（需要 admin 角色）
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async send(@Body() dto: SendNotificationDto) {
    const notification = await this.notificationService.send(dto)
    return { success: true, data: notification }
  }

  /**
   * 批量发送通知（需要 admin 角色）
   */
  @Post('batch')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async sendBatch(@Body() dtos: SendNotificationDto[]) {
    const notifications = await this.notificationService.sendBatch(dtos)
    return { success: true, data: notifications }
  }

  /**
   * 标记通知为已读
   */
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const success = await this.notificationService.markAsRead(id, req.user.id)
    return { success }
  }

  /**
   * 标记所有通知为已读
   */
  @Put('read-all')
  async markAllAsRead(@Req() req: any) {
    const count = await this.notificationService.markAllAsRead(req.user.id)
    return { success: true, data: count }
  }

  /**
   * 删除通知
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const deleted = await this.notificationService.delete(id, req.user.id)
    return { success: deleted }
  }
}
