import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { FileController } from './file.controller'
import { FileService } from './file.service'

@Module({
  imports: [
    MulterModule.register({
      dest: process.env.UPLOAD_DIR || './uploads',
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10, // 最多10个文件
      },
    }),
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
