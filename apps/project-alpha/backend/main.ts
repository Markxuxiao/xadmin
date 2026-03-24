import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { initMikroORM } from '../../../packages/core/backend'

async function bootstrap() {
  // Initialize MikroORM with PostgreSQL (creates schema + seeds data)
  await initMikroORM()

  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: ['http://localhost:3004', 'http://localhost:3002', 'http://localhost:3000'],
    credentials: true,
  })
  await app.listen(3001)
  console.log('[XAdmin Backend] Running on http://localhost:3001')
}

bootstrap()
