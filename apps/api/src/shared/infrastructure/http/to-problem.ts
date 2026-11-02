import { HttpException } from '@nestjs/common'
import {
  problemType,
  validationProblem,
  type ProblemDetails,
} from '@ufc-flow/contracts'

import { DomainError, type ErrorKind } from '../../domain/domain-error'
import { RequestValidationError } from './request-validation.error'

const KINDS: Record<ErrorKind, { status: number; title: string }> = {
  INVALID: { status: 400, title: 'Requisição inválida' },
  UNAUTHORIZED: { status: 401, title: 'Não autenticado' },
  FORBIDDEN: { status: 403, title: 'Sem permissão' },
  NOT_FOUND: { status: 404, title: 'Não encontrado' },
  CONFLICT: { status: 409, title: 'Conflito' },
  TOO_LARGE: { status: 413, title: 'Requisição grande demais' },
  RATE_LIMITED: { status: 429, title: 'Muitas tentativas' },
}

// Erros HTTP do Nest (rota inexistente, limite de tentativas...)
const HTTP: Record<number, { code: string; title: string }> = {
  400: { code: 'BAD_REQUEST', title: 'Requisição inválida' },
  401: { code: 'UNAUTHORIZED', title: 'Não autenticado' },
  403: { code: 'FORBIDDEN', title: 'Sem permissão' },
  404: { code: 'NOT_FOUND', title: 'Não encontrado' },
  413: { code: 'PAYLOAD_TOO_LARGE', title: 'Requisição grande demais' },
  429: { code: 'TOO_MANY_REQUESTS', title: 'Muitas tentativas' },
}

const problem = (
  code: string,
  status: number,
  title: string,
  instance: string,
  detail?: string,
): ProblemDetails => ({
  type: problemType(code),
  title,
  status,
  code,
  ...(detail ? { detail } : {}),
  instance,
})

// Converte qualquer erro em Problem Details (RFC 9457). Erros inesperados
// viram 500 sem detalhe, para não vazar nada do servidor.
export function toProblem(
  exception: unknown,
  instance: string,
): ProblemDetails {
  if (exception instanceof RequestValidationError) {
    return { ...validationProblem(exception.zodError), instance }
  }
  if (exception instanceof DomainError) {
    const { status, title } = KINDS[exception.kind]
    return problem(exception.code, status, title, instance, exception.message)
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus()
    const known = HTTP[status]
    return known
      ? problem(known.code, status, known.title, instance)
      : problem(`HTTP_${status}`, status, exception.message, instance)
  }
  return problem('INTERNAL_ERROR', 500, 'Erro interno', instance)
}
