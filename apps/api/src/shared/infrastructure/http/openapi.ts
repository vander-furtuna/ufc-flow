import { applyDecorators } from '@nestjs/common'
import { ApiBody, ApiResponse } from '@nestjs/swagger'

// Os schemas vêm do packages/contracts (toOpenApiComponents) e são
// referenciados por id, para validação e documentação não divergirem.
export const schemaRef = (id: string) => ({
  $ref: `#/components/schemas/${id}`,
})

export const arrayOf = (id: string) => ({ type: 'array', items: schemaRef(id) })

export const ApiJsonBody = (id: string) =>
  ApiBody({ required: true, schema: schemaRef(id) })

export const ApiJson = (
  status: number,
  description: string,
  schema?: Record<string, unknown>,
) => ApiResponse({ status, description, ...(schema ? { schema } : {}) })

const PROBLEMS: Record<number, string> = {
  400: 'Dados inválidos (VALIDATION_FAILED) ou regra de domínio violada',
  401: 'Sem token válido ou credenciais incorretas',
  403: 'Sem permissão para a ação',
  404: 'Recurso não encontrado',
  409: 'Conflito com o estado atual',
  413: 'Arquivo ou requisição grande demais',
  429: 'Muitas tentativas; aguarde e tente de novo',
  503: 'Serviço indisponível',
}

// Respostas de erro em Problem Details, sempre com o mesmo schema
export const ApiProblems = (...statuses: number[]) =>
  applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: PROBLEMS[status] ?? 'Erro',
        content: {
          'application/problem+json': { schema: schemaRef('ProblemDetails') },
        },
      }),
    ),
  )
