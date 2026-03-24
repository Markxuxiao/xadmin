import { Module, Global } from '@nestjs/common'
import { SwaggerModule as NestSwaggerModule } from '@nestjs/swagger'
import {
  createSwaggerBuilder,
  buildSwaggerOptions,
  DEFAULT_SWAGGER_CONFIG,
  SwaggerConfig,
} from './swagger.config'

export const SWAGGER_CONFIG_TOKEN = 'SWAGGER_CONFIG'

@Global()
@Module({
  providers: [
    {
      provide: SWAGGER_CONFIG_TOKEN,
      useValue: DEFAULT_SWAGGER_CONFIG,
    },
  ],
  exports: [SWAGGER_CONFIG_TOKEN],
})
export class SwaggerModule {
  static forRoot(config: SwaggerConfig = DEFAULT_SWAGGER_CONFIG) {
    const configProvider = {
      provide: SWAGGER_CONFIG_TOKEN,
      useValue: config,
    }

    return {
      module: SwaggerModule,
      providers: [configProvider],
      exports: [SWAGGER_CONFIG_TOKEN],
    }
  }
}

/**
 * Initialize Swagger document for the NestJS application
 */
export function initSwagger(app: any, config: SwaggerConfig = DEFAULT_SWAGGER_CONFIG) {
  const document = NestSwaggerModule.createDocument(
    app,
    createSwaggerBuilder(config),
    buildSwaggerOptions(),
  )

  // Serve Swagger UI at /api/docs
  NestSwaggerModule.setup(config.path || DEFAULT_SWAGGER_CONFIG.path!, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: config.title,
  })

  return document
}
