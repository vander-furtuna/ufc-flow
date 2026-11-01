import { timingSafeEqual } from 'node:crypto'

import type { INestApplication } from '@nestjs/common'
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger'
import { toOpenApiComponents } from '@ufc-flow/contracts'
import type { NextFunction, Request, Response } from 'express'

import type { Env } from '../../../config/env'

type Schemas = NonNullable<OpenAPIObject['components']>['schemas']

// Documento OpenAPI da v1, com os schemas do contracts como componentes
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('UFC Flow API')
    .setDescription(
      'API do UFC Flow. Erros em Problem Details (application/problem+json). Para testar rotas protegidas, entre em POST /v1/auth/sign-in e use o accessToken em Authorize.',
    )
    .setVersion('1')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  document.components = {
    ...document.components,
    schemas: {
      ...(toOpenApiComponents() as Schemas),
      ...document.components?.schemas,
    },
  }
  return document
}

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function basicAuth(user: string, password: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    const header = request.headers.authorization ?? ''
    const [scheme, encoded] = header.split(' ')
    const [givenUser = '', givenPassword = ''] = Buffer.from(
      encoded ?? '',
      'base64',
    )
      .toString()
      .split(':')
    if (
      scheme === 'Basic' &&
      safeEqual(givenUser, user) &&
      safeEqual(givenPassword, password)
    ) {
      next()
      return
    }
    response.setHeader('WWW-Authenticate', 'Basic realm="UFC Flow API"')
    response.status(401).send('Autenticação necessária')
  }
}

// Swagger UI em /docs e JSON em /docs/openapi.json. Em produção fica atrás
// de Basic Auth ou desligado (SWAGGER_ENABLED=false).
export function setupSwagger(app: INestApplication, env: Env) {
  if (!env.SWAGGER_ENABLED) return
  if (env.SWAGGER_USER && env.SWAGGER_PASSWORD) {
    app.use('/docs', basicAuth(env.SWAGGER_USER, env.SWAGGER_PASSWORD))
  }
  SwaggerModule.setup('docs', app, createOpenApiDocument(app), {
    jsonDocumentUrl: 'docs/openapi.json',
    customSiteTitle: 'UFC Flow API',
  })
}
