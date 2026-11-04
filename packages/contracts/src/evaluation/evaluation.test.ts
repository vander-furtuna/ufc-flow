import { describe, expect, it } from 'vitest'

import {
  evaluationCriterionInputSchema,
  evaluationInputSchema,
  subjectEvaluationSummarySchema,
} from './evaluation'

const ID = '1b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b'
const OTHER = '2b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b'

describe('avaliação de disciplinas', () => {
  it('notas de 1 a 5, um critério uma vez só', () => {
    expect(
      evaluationInputSchema.safeParse({
        scores: [
          { criterionId: ID, score: 5 },
          { criterionId: OTHER, score: 1 },
        ],
      }).success,
    ).toBe(true)
    expect(
      evaluationInputSchema.safeParse({
        scores: [{ criterionId: ID, score: 6 }],
      }).success,
    ).toBe(false)
    expect(
      evaluationInputSchema.safeParse({
        scores: [
          { criterionId: ID, score: 2 },
          { criterionId: ID, score: 3 },
        ],
      }).success,
    ).toBe(false)
  })

  it('critério com chave simples e rótulos nas pontas', () => {
    expect(
      evaluationCriterionInputSchema.parse({
        key: 'carga',
        label: 'Carga de trabalho',
        description: ' ',
        lowLabel: 'leve',
        highLabel: 'pesada',
      }),
    ).toMatchObject({ description: null, isActive: true })
    expect(
      evaluationCriterionInputSchema.safeParse({
        key: 'Carga de Trabalho',
        label: 'x',
        lowLabel: 'a',
        highLabel: 'b',
      }).success,
    ).toBe(false)
  })

  it('resumo abaixo do mínimo vem sem números', () => {
    expect(
      subjectEvaluationSummarySchema.safeParse({
        subject: { code: 'ECO0005', name: 'Introdução à Engenharia' },
        enough: false,
        total: null,
        criteria: [
          {
            id: ID,
            key: 'carga',
            label: 'Carga de trabalho',
            description: null,
            lowLabel: 'leve',
            highLabel: 'pesada',
            mean: null,
            count: null,
            distribution: null,
          },
        ],
      }).success,
    ).toBe(true)
  })
})
