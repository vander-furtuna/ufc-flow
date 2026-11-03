import { describe, expect, it } from 'vitest'

import { extractMentions, splitMentions } from './extract-mentions'

describe('extractMentions', () => {
  it('extrai o código de uma menção', () => {
    expect(extractMentions('Alguém tem a lista de @ECO0005?')).toEqual([
      'ECO0005',
    ])
  })

  it('extrai várias menções na ordem em que aparecem, sem repetir', () => {
    expect(
      extractMentions('@SBL0057 antes de @ECO0018, e depois @SBL0057 de novo'),
    ).toEqual(['SBL0057', 'ECO0018'])
  })

  it('aceita de 2 a 5 letras e de 3 a 5 dígitos', () => {
    expect(extractMentions('@AB123 @ABCDE12345')).toEqual([
      'AB123',
      'ABCDE12345',
    ])
  })

  it('aceita pontuação em volta da menção', () => {
    expect(extractMentions('(@ECO0005), @CK0211. "@SBL0084"')).toEqual([
      'ECO0005',
      'CK0211',
      'SBL0084',
    ])
  })

  it('ignora códigos maiores que o formato', () => {
    expect(extractMentions('@ECO000512 @ABCDEF123 @ECO0005abc')).toEqual([])
  })

  it('ignora códigos curtos demais', () => {
    expect(extractMentions('@E0005 @ECO12')).toEqual([])
  })

  it('ignora códigos em minúsculas', () => {
    expect(extractMentions('@eco0005 @Eco0005')).toEqual([])
  })

  it('ignora @ colado em palavra, como em e-mails', () => {
    expect(extractMentions('aluno@ECO0005 e x_@ECO0006')).toEqual([])
  })

  it('devolve lista vazia sem menções', () => {
    expect(extractMentions('Sem menções aqui, nem @ sozinho')).toEqual([])
  })
})

describe('splitMentions', () => {
  it('separa o texto e os tokens, na ordem', () => {
    expect(splitMentions('A prova de @ECO0036 e (@SBL0057).')).toEqual([
      { text: 'A prova de ' },
      { code: 'ECO0036' },
      { text: ' e (' },
      { code: 'SBL0057' },
      { text: ').' },
    ])
  })

  it('sem menção, um trecho só; vazio, nenhum', () => {
    expect(splitMentions('Oi, @todos')).toEqual([{ text: 'Oi, @todos' }])
    expect(splitMentions('')).toEqual([])
  })

  it('o que extractMentions ignora continua texto', () => {
    expect(splitMentions('e-mail ana@ECO0005.com e @ECO0005abc')).toEqual([
      { text: 'e-mail ana@ECO0005.com e @ECO0005abc' },
    ])
  })
})
