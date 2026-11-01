import { describe, expect, it } from 'vitest'

import {
  compareTerms,
  formatTerm,
  isSameTerm,
  nextTerm,
  parseTerm,
  previousTerm,
} from './term'

describe('parseTerm', () => {
  it('lê o código do termo letivo', () => {
    expect(parseTerm('2026.1')).toEqual({ year: 2026, period: 1 })
    expect(parseTerm('2025.2')).toEqual({ year: 2025, period: 2 })
  })

  it.each([
    '2026',
    '2026.3',
    '2026.0',
    '2026.01',
    '26.1',
    '02026.1',
    ' 2026.1',
    '2026.1 ',
    '2026-1',
    '',
  ])('rejeita %j', (code) => {
    expect(parseTerm(code)).toBeNull()
  })
})

describe('formatTerm', () => {
  it('gera o código a partir do termo', () => {
    expect(formatTerm({ year: 2026, period: 2 })).toBe('2026.2')
  })

  it('volta ao mesmo código depois do parse', () => {
    const term = parseTerm('2024.1')
    expect(term && formatTerm(term)).toBe('2024.1')
  })
})

describe('compareTerms', () => {
  const t20261 = { year: 2026, period: 1 } as const
  const t20262 = { year: 2026, period: 2 } as const
  const t20271 = { year: 2027, period: 1 } as const

  it('ordena por ano e depois por período', () => {
    expect(compareTerms(t20261, t20262)).toBeLessThan(0)
    expect(compareTerms(t20262, t20261)).toBeGreaterThan(0)
    expect(compareTerms(t20262, t20271)).toBeLessThan(0)
    expect(compareTerms(t20261, { year: 2026, period: 1 })).toBe(0)
  })

  it('serve para ordenar uma lista', () => {
    expect([t20271, t20261, t20262].sort(compareTerms)).toEqual([
      t20261,
      t20262,
      t20271,
    ])
  })

  it('isSameTerm compara ano e período', () => {
    expect(isSameTerm(t20261, { year: 2026, period: 1 })).toBe(true)
    expect(isSameTerm(t20261, t20262)).toBe(false)
  })
})

describe('nextTerm e previousTerm', () => {
  it('avança o período dentro do ano', () => {
    expect(nextTerm({ year: 2026, period: 1 })).toEqual({
      year: 2026,
      period: 2,
    })
  })

  it('vira o ano depois do segundo período', () => {
    expect(nextTerm({ year: 2026, period: 2 })).toEqual({
      year: 2027,
      period: 1,
    })
  })

  it('volta o período dentro do ano', () => {
    expect(previousTerm({ year: 2026, period: 2 })).toEqual({
      year: 2026,
      period: 1,
    })
  })

  it('volta para o segundo período do ano anterior', () => {
    expect(previousTerm({ year: 2026, period: 1 })).toEqual({
      year: 2025,
      period: 2,
    })
  })
})
