import { describe, expect, it } from 'vitest'

import { titleCase } from './title-case'

describe('titleCase', () => {
  it('primeira letra maiúscula, preposições em minúsculas', () => {
    expect(titleCase('CÁLCULO DIFERENCIAL E INTEGRAL')).toBe(
      'Cálculo Diferencial e Integral',
    )
  })

  it('algarismos romanos continuam em maiúsculas', () => {
    expect(titleCase('CÁLCULO DIFERENCIAL E INTEGRAL II')).toBe(
      'Cálculo Diferencial e Integral II',
    )
    expect(titleCase('MICROPROCESSADORES II')).toBe('Microprocessadores II')
    expect(titleCase('FÍSICA IV')).toBe('Física IV')
  })

  it('texto que não vem todo em maiúsculas fica como está', () => {
    expect(titleCase('Cálculo Aplicado à Economia')).toBe(
      'Cálculo Aplicado à Economia',
    )
  })
})
