import {
  Controller, Get, Post, Delete, Param,
  Query, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Req, Res
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { FileService } from './file.service'
import { AuthGuard } from '../user/auth.guard'
import { RolesGuard } from '../../base/guards/roles.guard'
import { Roles } from '../../base/guards/roles.decorator'
import * as fs from 'fs'
import * as path from 'path'

@ApiTags('file')
@ApiBearerAuth('JWT-auth')
@Controller('file')
@UseGuards(AuthGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * 上传单个文件
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传单个文件' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category: string = 'attachment',
    @Req() req: any,
  ) {
    if (!file) {
      return { success: false, message: '请选择要上传的文件' }
    }
    try {
      const result = await this.fileService.upload(file, category, {
        id: req.user.id,
        username: req.user.username,
      })
      return { success: true, data: result }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 上传多个文件
   */
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: '上传多个文件' })
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('category') category: string = 'attachment',
    @Req() req: any,
  ) {
    if (!files || files.length === 0) {
      return { success: false, message: '请选择要上传的文件' }
    }
    try {
      const results = await Promise.all(
        files.map(file =>
          this.fileService.upload(file, category, {
            id: req.user.id,
            username: req.user.username,
          })
        )
      )
      return { success: true, data: results }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取文件列表
   */
  @Get()
  @ApiOperation({ summary: '获取文件列表' })
  async findAll(@Query() query: {
    category?: string
    uploaderId?: string
    page?: number
    pageSize?: number
  }) {
    const result = await this.fileService.findAll(query)
    return { success: true, ...result }
  }

  /**
   * 获取单个文件信息
   */
  @Get(':id')
  @ApiOperation({ summary: '获取单个文件信息' })
  async findOne(@Param('id') id: string) {
    const file = await this.fileService.findOne(id)
    if (!file) {
      return { success: false, message: '文件不存在' }
    }
    return { success: true, data: file }
  }

  /**
   * 下载文件
   */
  @Get(':id/download')
  @ApiOperation({ summary: '下载文件' })
  async download(@Param('id') id: string, @Res() res: any) {
    const fileInfo = await this.fileService.getFilePath(id)
    if (!fileInfo) {
      return res.status(404).send('File not found')
    }
    if (!fs.existsSync(fileInfo.path)) {
      return res.status(404).send('File not found on disk')
    }
    res.download(fileInfo.path)
  }

  /**
   * 删除文件
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '删除文件' })
  async delete(@Param('id') id: string) {
    try {
      const deleted = await this.fileService.delete(id)
      return { success: deleted }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }
}
