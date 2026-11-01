import { describe, expect, it } from 'vitest'

import { parseCourseOption, readSearchPage } from './read-search-page'
import { loadFixture } from './test-utils'

describe('parseCourseOption', () => {
  it.each([
    [
      'ENGENHARIA DE COMPUTAÇÃO/CUFCSOBRAL - SOBRAL',
      'ENGENHARIA DE COMPUTAÇÃO',
      'CUFCSOBRAL',
      'SOBRAL',
    ],
    [
      'PSICOLOGIA/CCGPSIC - SOBRAL/CUFCSOBRAL - SOBRAL',
      'PSICOLOGIA/CCGPSIC - SOBRAL',
      'CUFCSOBRAL',
      'SOBRAL',
    ],
    [
      'PEDAGOGIA DA TERRA / LICENCIATURA PLENA/PRG - FORTALEZA',
      'PEDAGOGIA DA TERRA / LICENCIATURA PLENA',
      'PRG',
      'FORTALEZA',
    ],
  ])('lê "%s"', (text, name, unitAcronym, city) => {
    expect(parseCourseOption('1', text)).toEqual({
      sigaaId: '1',
      name,
      city,
      modality: null,
      unitAcronym,
      unitName: null,
    })
  })

  it('ignora a opção sem curso', () => {
    expect(parseCourseOption('0', '-- SELECIONE --')).toBeNull()
  })
})

describe('readSearchPage', () => {
  const page = readSearchPage(loadFixture('busca-estruturas.html'))

  it('lê os 170 cursos do select', () => {
    expect(page?.courses).toHaveLength(170)
  })

  it('lê o curso selecionado', () => {
    expect(page?.selectedCourseId).toBe('657484')
  })

  it('lê as estruturas encontradas com o id da EC no SIGAA', () => {
    expect(page?.curricula).toEqual([
      {
        code: '2006.2',
        sigaaId: '658760',
        matrixName: 'ENGENHARIA DE COMPUTAÇÃO - MT - BACHARELADO',
        isCurrent: true,
      },
    ])
  })

  it('devolve null fora da tela de busca', () => {
    expect(
      readSearchPage(loadFixture('estrutura-medicina-2024-1.html')),
    ).toBeNull()
  })
})
