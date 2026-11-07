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
  // Atrás do proxy do Coolify (ou do web, que repassa o IP), o IP real vem
  // do X-Forwarded-For
  app.set('trust proxy', env.TRUST_PROXY_HOPS)
  app.disable('x-powered-by')
  // Uma estrutura curricular grande passa dos 100 KB do padrão
  app.useBodyParser('json', { limit: '2mb' })
  app.useGlobalFilters(new ProblemDetailsFilter())
  app.enableShutdownHooks()
  setupSwagger(app, env)
  return app
}
