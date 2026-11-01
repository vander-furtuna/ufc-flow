import { describe, expect, it } from 'vitest'

import { normalizeSearchText } from './normalize-search'

describe('normalizeSearchText', () => {
  it('passa para minúsculas', () => {
    expect(normalizeSearchText('CÁLCULO Fundamental')).toBe(
      'calculo fundamental',
    )
  })

  it('remove acentos, til e cedilha', () => {
    expect(normalizeSearchText('Introdução à Computação')).toBe(
      'introducao a computacao',
    )
    expect(normalizeSearchText('Álgebra Linear Ê Õ ü')).toBe(
      'algebra linear e o u',
    )
  })

  it('mantém espaços, números e pontuação', () => {
    expect(normalizeSearchText(' Física II - 2026.1 ')).toBe(
      ' fisica ii - 2026.1 ',
    )
  })

  it('aceita texto vazio', () => {
    expect(normalizeSearchText('')).toBe('')
  })

  it('encontra o termo independentemente de acento e caixa', () => {
    const name = normalizeSearchText('Programação Orientada a Objetos')
    expect(name.includes(normalizeSearchText('PROGRAMACAO'))).toBe(true)
  })
})
