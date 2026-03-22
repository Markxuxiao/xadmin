import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: 'http://localhost:3004', // Vite dev server
    credentials: true
  })
  await app.listen(3001)
  console.log('[XAdmin Backend] Running on http://localhost:3001')
}
bootstrap()
