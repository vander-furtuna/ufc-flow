import { z } from 'zod'

const PROBLEM_BASE_URL = 'https://flow.ufc.br/problems/'

// Códigos estáveis de erro, como SCHEDULE_TIME_CONFLICT
const errorCodeSchema = z
  .string()
  .regex(
    /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/,
    'Código fora de SCREAMING_SNAKE_CASE',
  )

export const validationErrorSchema = z
  .object({
    path: z.array(z.union([z.string(), z.int()])),
    message: z.string(),
    code: errorCodeSchema,
  })
  .meta({ id: 'ValidationError' })

// Erro da API no formato Problem Details (RFC 9457), servido como
// application/problem+json. `errors` só aparece em falhas de validação.
export const problemDetailsSchema = z
  .object({
    type: z.url(),
    title: z.string(),
    status: z.int().min(400).max(599),
    detail: z.string().optional(),
    code: errorCodeSchema,
    instance: z.string().optional(),
    errors: z.array(validationErrorSchema).optional(),
  })
  .meta({ id: 'ProblemDetails' })

export type ValidationError = z.infer<typeof validationErrorSchema>
export type ProblemDetails = z.infer<typeof problemDetailsSchema>

export function problemType(code: string): string {
  return PROBLEM_BASE_URL + code.toLowerCase().replaceAll('_', '-')
}

// Falha de validação de um schema Zod. Cada issue vira um erro com o caminho
// do campo; o código vem de params.code, quando a regra define, ou do tipo
// da issue (VALIDATION_TOO_SMALL, VALIDATION_INVALID_TYPE...).
export function validationProblem(error: z.ZodError): ProblemDetails {
  return {
    type: problemType('VALIDATION_FAILED'),
    title: 'Dados inválidos',
    status: 400,
    detail: 'Um ou mais campos não passaram na validação',
    code: 'VALIDATION_FAILED',
    errors: error.issues.map((issue) => {
      const custom =
        issue.code === 'custom' ? (issue.params?.code as unknown) : undefined
      return {
        path: issue.path.map((segment) =>
          typeof segment === 'symbol' ? String(segment) : segment,
        ),
        message: issue.message,
        code:
          typeof custom === 'string'
            ? custom
            : `VALIDATION_${issue.code.toUpperCase()}`,
      }
    }),
  }
}
