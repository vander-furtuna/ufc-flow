import { z } from 'zod'

// Garante que todos os schemas nomeados estejam no registro global
import './catalog/curriculum-import-v1'
import './catalog/sigaa-course'
import './catalog/catalog'
import './catalog/ingestion'
import './classes/classes'
import './planning/schedules'
import './notifications/notifications'
import './common/problem-details'
import './enums'
import './hub/post'
import './identity/auth'
import './identity/moderation'
import './common/health'

export type JsonSchema = Record<string, unknown>

const COMPONENTS_PATH = '#/components/schemas/'

// JSON Schema (draft 2020-12) do que o cliente envia. Refinamentos, como a
// forma normalizada dos requisitos, não aparecem: continuam só no Zod.
export function toJsonSchema(schema: z.ZodType): JsonSchema {
  return z.toJSONSchema(schema, { io: 'input' }) as JsonSchema
}

// Todos os schemas nomeados (.meta({ id }) ou register) como componentes do
// OpenAPI 3.0, para o Swagger da API. As referências entre eles apontam para
// #/components/schemas/<id>.
export function toOpenApiComponents(): Record<string, JsonSchema> {
  const { schemas } = z.toJSONSchema(z.globalRegistry, {
    target: 'openapi-3.0',
    io: 'input',
    uri: (id) => COMPONENTS_PATH + id,
  })
  return Object.fromEntries(
    Object.entries(schemas).map(([id, schema]) => {
      const { $schema: _, $id: __, ...rest } = schema as JsonSchema
      return [id, rest]
    }),
  )
}
