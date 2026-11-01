import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common'
import { problemType } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { DomainError } from '../../domain/domain-error'
import { RequestValidationError } from './request-validation.error'
import { toProblem } from './to-problem'

describe('toProblem', () => {
  it.each([
    ['INVALID', 400],
    ['UNAUTHORIZED', 401],
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 404],
    ['CONFLICT', 409],
  ] as const)('erro de domínio %s vira %i', (kind, status) => {
    const problem = toProblem(
      new DomainError('USER_EMAIL_TAKEN', kind, 'E-mail já cadastrado'),
      '/v1/auth/sign-up',
    )
    expect(problem).toMatchObject({
      type: problemType('USER_EMAIL_TAKEN'),
      status,
      code: 'USER_EMAIL_TAKEN',
      detail: 'E-mail já cadastrado',
      instance: '/v1/auth/sign-up',
    })
  })

  it('falha de validação vira 400 com os campos', () => {
    const result = z.object({ email: z.email() }).safeParse({ email: 'x' })
    const problem = toProblem(
      new RequestValidationError(result.error!),
      '/v1/auth/sign-in',
    )
    expect(problem).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      instance: '/v1/auth/sign-in',
    })
    expect(problem.errors?.[0]?.path).toEqual(['email'])
  })

  it('rota inexistente vira 404 NOT_FOUND', () => {
    expect(toProblem(new NotFoundException(), '/v1/nada')).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      title: 'Não encontrado',
    })
  })

  it('limite de tentativas vira 429 TOO_MANY_REQUESTS', () => {
    expect(
      toProblem(
        new HttpException('Too Many Requests', 429),
        '/v1/auth/sign-in',
      ),
    ).toMatchObject({ status: 429, code: 'TOO_MANY_REQUESTS' })
  })

  it('outros erros HTTP mantêm o status', () => {
    expect(toProblem(new BadRequestException(), '/v1/x')).toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
    })
  })

  it('erro desconhecido vira 500 sem vazar a mensagem', () => {
    const problem = toProblem(new Error('senha do banco'), '/v1/x')
    expect(problem).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' })
    expect(JSON.stringify(problem)).not.toContain('senha do banco')
  })
})
