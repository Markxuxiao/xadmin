import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ScheduledTaskService } from './scheduled-task.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'

@Controller('scheduled-task')
@UseGuards(AuthGuard)
export class ScheduledTaskController {
  constructor(private readonly scheduledTaskService: ScheduledTaskService) {}

  @Get()
  async findAll(
    @Query('enabled') enabled?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const params: any = {}
    if (enabled !== undefined) {
      params.enabled = enabled === 'true'
    }
    if (page) params.page = parseInt(page, 10)
    if (pageSize) params.pageSize = parseInt(pageSize, 10)

    const result = await this.scheduledTaskService.findAll(params)
    return { success: true, data: result }
  }

  @Get('status')
  async getStatus() {
    const status = this.scheduledTaskService.getExecutorStatus()
    return { success: true, data: status }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const task = await this.scheduledTaskService.findOne(id)
    if (!task) {
      return { success: false, message: '任务不存在' }
    }
    return { success: true, data: task }
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() data: {
    name: string
    description?: string
    cron: string
    handler: string
    enabled?: boolean
    taskParams?: any
  }) {
    try {
      const task = await this.scheduledTaskService.create(data)
      return { success: true, data: task }
    } catch (error: any) {
      return { success: false, message: error?.message || '创建失败' }
    }
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<{
      name: string
      description: string
      cron: string
      handler: string
      enabled: boolean
      taskParams: any
    }>,
  ) {
    try {
      const task = await this.scheduledTaskService.update(id, data)
      if (!task) {
        return { success: false, message: '任务不存在' }
      }
      return { success: true, data: task }
    } catch (error: any) {
      return { success: false, message: error?.message || '更新失败' }
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async delete(@Param('id') id: string) {
    try {
      const deleted = await this.scheduledTaskService.delete(id)
      return { success: deleted }
    } catch (error: any) {
      return { success: false, message: error?.message || '删除失败' }
    }
  }

  @Post(':id/enable')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async enable(@Param('id') id: string) {
    try {
      const task = await this.scheduledTaskService.enable(id)
      if (!task) {
        return { success: false, message: '任务不存在' }
      }
      return { success: true, data: task }
    } catch (error: any) {
      return { success: false, message: error?.message || '启用失败' }
    }
  }

  @Post(':id/disable')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async disable(@Param('id') id: string) {
    try {
      const task = await this.scheduledTaskService.disable(id)
      if (!task) {
        return { success: false, message: '任务不存在' }
      }
      return { success: true, data: task }
    } catch (error: any) {
      return { success: false, message: error?.message || '禁用失败' }
    }
  }

  @Post(':id/trigger')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async trigger(@Param('id') id: string) {
    try {
      const result = await this.scheduledTaskService.trigger(id)
      return { success: result.success, message: result.success ? '任务执行成功' : result.error }
    } catch (error: any) {
      return { success: false, message: error?.message || '任务执行失败' }
    }
  }
}
