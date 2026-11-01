import type { OpenAPIObject } from '@nestjs/swagger'

import { parseEnv } from '../config/env'
import { createApp } from '../create-app'
import { createOpenApiDocument } from '../shared/infrastructure/http/swagger'

// O documento não depende do banco: o pool do pg só conecta na primeira
// consulta, e nenhuma consulta é feita aqui
const DOCUMENT_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://openapi:openapi@localhost:5432/openapi',
  JWT_SECRET: 'openapi-document-secret-with-32-chars',
  SWAGGER_ENABLED: 'false',
}

export async function openApiDocument(): Promise<OpenAPIObject> {
  const app = await createApp(parseEnv(DOCUMENT_ENV), { logger: false })
  try {
    return createOpenApiDocument(app)
  } finally {
    await app.close()
  }
}

export async function openApiJson(): Promise<string> {
  return `${JSON.stringify(await openApiDocument(), null, 2)}\n`
}
