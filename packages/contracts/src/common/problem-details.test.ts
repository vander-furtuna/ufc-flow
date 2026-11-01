import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  problemDetailsSchema,
  problemType,
  validationProblem,
} from './problem-details'

describe('problemType', () => {
  it('monta a URI do tipo a partir do código', () => {
    expect(problemType('SCHEDULE_TIME_CONFLICT')).toBe(
      'https://flow.ufc.br/problems/schedule-time-conflict',
    )
  })
})

describe('problemDetailsSchema', () => {
  const problem = {
    type: problemType('CURRICULUM_LOCKED_FIELD'),
    title: 'Campo bloqueado',
    status: 409,
    detail: 'A EC já tem matrículas vinculadas',
    code: 'CURRICULUM_LOCKED_FIELD',
  }

  it('aceita um problema com os campos obrigatórios', () => {
    expect(problemDetailsSchema.parse(problem)).toEqual(problem)
  })

  it('aceita instance e a lista de erros de validação', () => {
    const value = {
      ...problem,
      instance: '/v1/courses/eng/curricula/2006-2',
      errors: [{ path: ['subjects', 0, 'code'], message: 'x', code: 'X' }],
    }
    expect(problemDetailsSchema.safeParse(value).success).toBe(true)
  })

  it('recusa status fora de 4xx e 5xx e código fora do padrão', () => {
    expect(
      problemDetailsSchema.safeParse({ ...problem, status: 200 }).success,
    ).toBe(false)
    expect(
      problemDetailsSchema.safeParse({ ...problem, code: 'locked' }).success,
    ).toBe(false)
  })
})

describe('validationProblem', () => {
  const schema = z
    .object({ name: z.string().min(1), age: z.int() })
    .superRefine((value, ctx) => {
      if (value.name === 'admin') {
        ctx.addIssue({
          code: 'custom',
          path: ['name'],
          message: 'Nome reservado',
          params: { code: 'USER_NAME_RESERVED' },
        })
      }
    })

  it('converte os erros do Zod em 400 com o caminho de cada campo', () => {
    const result = schema.safeParse({ name: '', age: 1.5 })
    if (result.success) throw new Error('deveria falhar')

    const problem = validationProblem(result.error)
    expect(problemDetailsSchema.safeParse(problem).success).toBe(true)
    expect(problem).toMatchObject({
      type: problemType('VALIDATION_FAILED'),
      status: 400,
      code: 'VALIDATION_FAILED',
    })
    expect(problem.errors?.map(({ path, code }) => ({ path, code }))).toEqual([
      { path: ['name'], code: 'VALIDATION_TOO_SMALL' },
      { path: ['age'], code: 'VALIDATION_INVALID_TYPE' },
    ])
  })

  it('usa o código do params quando a regra define um', () => {
    const result = schema.safeParse({ name: 'admin', age: 20 })
    if (result.success) throw new Error('deveria falhar')
    expect(validationProblem(result.error).errors).toEqual([
      { path: ['name'], message: 'Nome reservado', code: 'USER_NAME_RESERVED' },
    ])
  })
})
