import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { AppModule } from './app.module'
import type { Env } from './config/env'
import { ProblemDetailsFilter } from './shared/infrastructure/http/problem-details.filter'
import { setupSwagger } from './shared/infrastructure/http/swagger'

// Monta a aplicação; usada pelo main, pelos testes e2e e pela exportação do
// openapi.json
export async function createApp(env: Env, { logger = true } = {}) {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(env),
    {
      logger: logger ? ['error', 'warn', 'log'] : false,
      // Erro na montagem vira exceção (o padrão do Nest encerra o processo)
      abortOnError: false,
    },
  )
  // Atrás do proxy do Coolify, o IP real vem do X-Forwarded-For
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.useGlobalFilters(new ProblemDetailsFilter())
  app.enableShutdownHooks()
  setupSwagger(app, env)
  return app
}
