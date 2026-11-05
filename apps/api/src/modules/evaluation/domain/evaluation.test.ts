import { describe, expect, it } from 'vitest'

import type { DomainError } from '../../../shared/domain/domain-error'
import {
  assertScores,
  eligibilityOf,
  isInstitutionalEmail,
  summarize,
  type Criterion,
} from './evaluation'

const criterion = (
  id: string,
  overrides: Partial<Criterion> = {},
): Criterion => ({
  id,
  key: id,
  label: id,
  description: null,
  lowLabel: 'pouca',
  highLabel: 'muita',
  isActive: true,
  position: 0,
  ...overrides,
})

const code = (work: () => unknown) => {
  try {
    work()
  } catch (error) {
    return (error as DomainError).code
  }
  return null
}

describe('quem avalia', () => {
  it.each([
    [[], { eligible: false, status: null, term: null }],
    [
      [{ status: 'CURSANDO', termCode: '2026.2' }],
      { eligible: false, status: null, term: null },
    ],
    [
      [{ status: 'TRANCADA', termCode: '2024.1' }],
      { eligible: false, status: null, term: null },
    ],
    [
      [{ status: 'APROVEITADA', termCode: '2023.1' }],
      { eligible: false, status: null, term: null },
    ],
    [
      [{ status: 'REPROVADO', termCode: '2023.1' }],
      { eligible: true, status: 'REPROVADO', term: '2023.1' },
    ],
    // O aprovado mais recente vem antes de uma reprovação
    [
      [
        { status: 'REPROVADO', termCode: '2023.1' },
        { status: 'APROVADO', termCode: '2023.2' },
        { status: 'APROVADO', termCode: '2024.1' },
      ],
      { eligible: true, status: 'APROVADO', term: '2024.1' },
    ],
  ] as const)('%o', (records, expected) => {
    expect(eligibilityOf(records)).toEqual(expected)
  })

  it('e-mail institucional', () => {
    expect(isInstitutionalEmail('ana@alu.ufc.br')).toBe(true)
    expect(isInstitutionalEmail('ANA@ALU.UFC.BR')).toBe(true)
    expect(isInstitutionalEmail('ana@ufc.br')).toBe(false)
    expect(isInstitutionalEmail('ana@alu.ufc.br.com')).toBe(false)
  })
})

describe('notas', () => {
  const criteria = [
    criterion('a'),
    criterion('b'),
    criterion('off', { isActive: false }),
  ]
  it('uma nota para cada critério ativo, nada além', () => {
    expect(
      code(() =>
        assertScores(
          [
            { criterionId: 'a', score: 5 },
            { criterionId: 'b', score: 1 },
          ],
          criteria,
        ),
      ),
    ).toBeNull()
    expect(
      code(() => assertScores([{ criterionId: 'a', score: 5 }], criteria)),
    ).toBe('EVALUATION_INCOMPLETE')
    expect(
      code(() =>
        assertScores(
          [
            { criterionId: 'a', score: 5 },
            { criterionId: 'b', score: 1 },
            { criterionId: 'off', score: 3 },
          ],
          criteria,
        ),
      ),
    ).toBe('EVALUATION_UNKNOWN_CRITERION')
  })
})

describe('resumo', () => {
  const criteria = [criterion('a'), criterion('b')]
  const scores = (values: number[], id = 'a') =>
    values.map((score) => ({ criterionId: id, score }))

  it('abaixo de 5 avaliações, nada de números', () => {
    const summary = summarize(4, scores([5, 5, 4, 4]), criteria)
    expect(summary.enough).toBe(false)
    expect(summary.total).toBeNull()
    expect(summary.criteria[0]).toMatchObject({
      mean: null,
      count: null,
      distribution: null,
    })
  })

  it('média com uma casa, contagem e distribuição por critério', () => {
    const summary = summarize(
      6,
      [...scores([5, 5, 4, 4, 3, 1]), ...scores([2, 2, 2, 2], 'b')],
      criteria,
    )
    expect(summary).toMatchObject({ enough: true, total: 6 })
    expect(summary.criteria[0]).toMatchObject({
      mean: 3.7,
      count: 6,
      distribution: [1, 0, 1, 2, 2],
    })
    // Critério novo com menos de 5 respostas fica sem números
    expect(summary.criteria[1]).toMatchObject({ mean: null, count: null })
  })
})
