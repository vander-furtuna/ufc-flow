import { describe, expect, it } from 'vitest'

import {
  activeMention,
  initials,
  insertMention,
  matchRange,
} from './mention-editor'

describe('activeMention', () => {
  it.each([
    ['Lista de @cálc', 14, { start: 9, query: 'cálc' }],
    ['Lista de @', 10, { start: 9, query: '' }],
    ['@SBL', 4, { start: 0, query: 'SBL' }],
    ['(@eco', 5, { start: 1, query: 'eco' }],
  ])('%s com o cursor em %i', (text, caret, expected) => {
    expect(activeMention(text, caret)).toEqual(expected)
  })

  it.each([
    ['ana@ufc', 7],
    ['Lista de @cálc depois', 21],
    ['sem arroba', 10],
    ['@cálculo diferencial', 20],
  ])('nada em %s', (text, caret) => {
    expect(activeMention(text, caret)).toBeNull()
  })
})

describe('insertMention', () => {
  it('troca o que foi digitado pelo token e põe um espaço', () => {
    expect(insertMention('Lista de @cálc?', 9, 14, 'SBL0057')).toEqual({
      text: 'Lista de @SBL0057 ?',
      caret: 18,
    })
  })
})

describe('matchRange', () => {
  it('acha o trecho sem acento e sem diferenciar maiúsculas', () => {
    expect(matchRange('Cálculo Diferencial', 'calc')).toEqual([0, 4])
    expect(matchRange('Cálculo Diferencial', 'DIF')).toEqual([8, 11])
    expect(matchRange('Física', 'xyz')).toBeNull()
    expect(matchRange('Física', '')).toBeNull()
  })
})

describe('initials', () => {
  it('duas iniciais', () => {
    expect(initials('Bruno Lima')).toBe('BL')
    expect(initials('ana')).toBe('A')
    expect(initials('  Maria  da Silva Souza ')).toBe('MD')
  })
})
