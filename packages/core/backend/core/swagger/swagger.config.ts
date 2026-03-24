import { DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger'

export interface SwaggerConfig {
  title: string
  description: string
  version: string
  path?: string
}

export const DEFAULT_SWAGGER_CONFIG: SwaggerConfig = {
  title: 'XAdmin API',
  description: 'XAdmin 后台管理系统 API 文档',
  version: '1.0.0',
  path: 'api/docs',
}

/**
 * Build Swagger document options
 */
export function buildSwaggerOptions(): SwaggerDocumentOptions {
  return {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  }
}

/**
 * Create Swagger configuration builder
 */
export function createSwaggerBuilder(config: SwaggerConfig = DEFAULT_SWAGGER_CONFIG) {
  return new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('user', 'User management')
    .addTag('role', 'Role management')
    .addTag('department', 'Department management')
    .addTag('dict', 'Dictionary management')
    .addTag('file', 'File management')
    .addTag('audit-log', 'Audit log management')
    .addTag('menu', 'Menu management')
    .build()
}
