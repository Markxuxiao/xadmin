import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { getDb } from '../../../packages/core/backend'

async function bootstrap() {
  // Initialize database (adds version + deletedAt columns, seeds data)
  getDb()

  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: ['http://localhost:3004', 'http://localhost:3002', 'http://localhost:3000'],
    credentials: true,
  })
  await app.listen(3001)
  console.log('[XAdmin Backend] Running on http://localhost:3001')
}

bootstrap()
