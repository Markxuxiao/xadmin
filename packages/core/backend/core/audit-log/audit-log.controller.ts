import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuditLogService } from './audit-log.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'

@ApiTags('audit-log')
@ApiBearerAuth('JWT-auth')
@Controller('audit-log')
@UseGuards(AuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: '获取审计日志列表' })
  async findAll(@Query() query: {
    action?: string
    entity?: string
    operatorId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }) {
    const result = await this.auditLogService.findAll(query)
    return { success: true, ...result }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个审计日志' })
  async findOne(@Param('id') id: string) {
    const log = await this.auditLogService.findOne(id)
    if (!log) {
      return { success: false, message: '日志不存在' }
    }
    return { success: true, data: log }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '删除审计日志' })
  async delete(@Param('id') id: string) {
    const deleted = await this.auditLogService.delete(id)
    return { success: deleted }
  }
}
