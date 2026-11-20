import { describe, expect, it } from 'vitest'

import {
  lastSelectableTerm,
  selectableTerms,
  termOfDate,
} from './selectable-terms'
import { formatTerm } from './term'

const day = (iso: string) => new Date(`${iso}T12:00:00`)

describe('termOfDate', () => {
  it.each([
    ['2026-01-02', '2026.1'],
    ['2026-07-31', '2026.1'],
    ['2026-08-01', '2026.2'],
    ['2026-12-31', '2026.2'],
  ])('%s é %s', (date, expected) => {
    expect(formatTerm(termOfDate(day(date)))).toBe(expected)
  })
})

describe('lastSelectableTerm', () => {
  it.each([
    [
      'vigente 2026.2 em novembro',
      { year: 2026, period: 2 },
      '2026-11-20',
      '2027.1',
    ],
    [
      'vigente esquecido em 2026.1 em novembro',
      { year: 2026, period: 1 },
      '2026-11-20',
      '2027.1',
    ],
    ['sem vigente, em março de 2027', null, '2027-03-10', '2027.2'],
    [
      'vigente adiantado 2027.1 em dezembro',
      { year: 2027, period: 1 },
      '2026-12-15',
      '2027.2',
    ],
  ] as const)('%s', (_, current, date, expected) => {
    expect(formatTerm(lastSelectableTerm(current, day(date)))).toBe(expected)
  })
})

describe('selectableTerms', () => {
  it('vai do semestre seguinte ao vigente até o primeiro ano, do mais novo ao mais antigo', () => {
    const terms = selectableTerms(
      { year: 2026, period: 2 },
      day('2026-11-20'),
      2022,
    )
    expect(terms.map(formatTerm)).toEqual([
      '2027.1',
      '2026.2',
      '2026.1',
      '2025.2',
      '2025.1',
      '2024.2',
      '2024.1',
      '2023.2',
      '2023.1',
      '2022.2',
      '2022.1',
    ])
  })

  it('primeiro ano depois do último selecionável não lista nada', () => {
    expect(selectableTerms(null, day('2026-11-20'), 2030)).toEqual([])
  })
})
