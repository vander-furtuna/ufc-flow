import { parseRequirement } from '@ufc-flow/academic-core'
import { describe, expect, it } from 'vitest'

import {
  readCurriculumPage,
  requirementText,
  type CurriculumPage,
} from './read-curriculum-page'
import { CURRICULUM_FIXTURES, loadFixture } from './test-utils'

const read = (name: string): CurriculumPage => {
  const page = readCurriculumPage(loadFixture(name))
  if (!page) throw new Error(`${name} não foi lida`)
  return page
}

const cell = (html: string) => {
  const td = document.createElement('td')
  td.innerHTML = html
  return td
}

describe('requirementText', () => {
  it('separa códigos e operadores mesmo sem espaço no HTML', () => {
    const td = cell(
      '<small>( (<acronym>EM0008</acronym>E<acronym>EM0007</acronym>) OU (<acronym>CAR0002</acronym>E<acronym>CAR0004</acronym>) )</small>',
    )
    expect(requirementText(td)).toBe(
      '( ( EM0008 E EM0007 ) OU ( CAR0002 E CAR0004 ) )',
    )
  })

  it('lê o HTML com espaços da página inteira', () => {
    const td = cell(
      '<small>( <acronym title="x">ECO0004</acronym> OU <acronym>SBL0086</acronym> )\n</small>',
    )
    expect(requirementText(td)).toBe('( ECO0004 OU SBL0086 )')
  })

  it('devolve vazio na célula sem requisito', () => {
    expect(requirementText(cell('<small>\n </small>'))).toBe('')
  })
})

describe('readCurriculumPage', () => {
  it('devolve null fora da página da estrutura', () => {
    expect(readCurriculumPage(loadFixture('busca-estruturas.html'))).toBeNull()
  })

  it.each([
    ['estrutura-agronomia-2024-2.html', 151],
    ['estrutura-arquitetura-e-urbanismo-2023-1.html', 111],
    ['estrutura-ciencias-de-dados-2024-1.html', 125],
    ['estrutura-engenharia-de-computacao-2006-2.html', 114],
    ['estrutura-engenharia-de-materiais-2010-1.html', 73],
    ['estrutura-engenharia-metalurgica-2023-1.html', 91],
    ['estrutura-gestao-de-politicas-publicas-2025-1.html', 86],
    ['estrutura-matematica-2024-1.html', 54],
    ['estrutura-medicina-2024-1.html', 108],
    ['estrutura-musica-2020-1.html', 112],
    ['estrutura-psicologia-2025-1.html', 163],
    ['pagina-estrutura-engenharia-de-computacao-2006-2.html', 114],
  ])('%s tem %i componentes', (name, count) => {
    expect(read(name).components).toHaveLength(count)
  })

  it.each(CURRICULUM_FIXTURES)('%s: todo requisito vira expressão', (name) => {
    for (const component of read(name).components) {
      for (const text of [
        component.prerequisitesText,
        component.corequisitesText,
        component.equivalencesText,
      ]) {
        expect(parseRequirement(text).ok, `${component.code}: ${text}`).toBe(
          true,
        )
      }
    }
  })

  it('lê o cabeçalho da EC', () => {
    expect(
      read('pagina-estrutura-engenharia-de-computacao-2006-2.html').header,
    ).toEqual({
      code: '2006.2',
      effectiveTerm: '2006.2',
      matrixName:
        'ENGENHARIA DE COMPUTAÇÃO - SOBRAL - Presencial - MT - BACHARELADO',
      unitName: 'CAMPUS DA UFC EM SOBRAL (11.00.01.28)',
      city: 'SOBRAL - CE',
      minTotalHours: 3648,
      maxTotalHours: null,
      mandatoryHours: 2752,
      optativeHours: 896,
      extensionHours: 0,
      specificActivityHours: 560,
      maxFreeOptativeHours: 320,
      minPeriods: 7,
      avgPeriods: 10,
      maxPeriods: 15,
      periodMinHours: 64,
      periodAvgHours: 528,
      periodMaxHours: 640,
      minEmphases: 0,
      maxEmphases: 0,
    })
  })

  it('separa o código da EC do período de vigor', () => {
    expect(
      read('estrutura-arquitetura-e-urbanismo-2023-1.html').header,
    ).toMatchObject({ code: '2023.1', effectiveTerm: '2024.1' })
    expect(read('estrutura-psicologia-2025-1.html').header).toMatchObject({
      code: '2026.1',
      effectiveTerm: '2025.1',
      minEmphases: 1,
      maxEmphases: 1,
    })
  })

  it('deixa as ênfases sem limite em "Sem exigências ou restrições"', () => {
    expect(
      read('estrutura-engenharia-de-materiais-2010-1.html').header,
    ).toMatchObject({ minEmphases: null, maxEmphases: null })
  })

  it('lê um componente com cargas, tipo, natureza e requisitos', () => {
    const eco0015 = read(
      'estrutura-engenharia-de-computacao-2006-2.html',
    ).components.find((item) => item.code === 'ECO0015')
    expect(eco0015).toEqual({
      code: 'ECO0015',
      name: 'TÉCNICAS DE PROGRAMAÇÃO',
      table: 'MANDATORY',
      semester: 2,
      durationTerms: 1,
      workloadHours: 64,
      credits: 4,
      theoryHours: 32,
      labHours: 32,
      eadHours: 0,
      extensionHours: 0,
      typeLabel: 'DISCIPLINA',
      natureLabel: 'OBRIGATÓRIA',
      prerequisitesText: '( ECO0004 OU SBL0086 )',
      equivalencesText: '',
      corequisitesText: '',
    })
  })

  it('lê componentes anuais e cargas sem créditos por parte (Medicina)', () => {
    const musica = read('estrutura-musica-2020-1.html').components
    expect(musica.find((item) => item.code === 'MSC0186')).toMatchObject({
      durationTerms: 2,
      typeLabel: 'TRABALHO DE CONCLUSÃO DE CURSO',
    })
    const ms0110 = read('estrutura-medicina-2024-1.html').components.find(
      (item) => item.code === 'MS0110',
    )
    expect(ms0110).toMatchObject({
      workloadHours: 96,
      credits: 6,
      theoryHours: 64,
      labHours: 32,
    })
  })

  it('guarda o semestre das optativas como o SIGAA mostra', () => {
    const materiais = read('estrutura-engenharia-de-materiais-2010-1.html')
    const semesters = new Set(
      materiais.components
        .filter((item) => item.table === 'OPTATIVE')
        .map((item) => item.semester ?? 0),
    )
    expect([...semesters].sort((a, b) => a - b)).toEqual([4, 8, 9, 10])
  })

  it('lê os grupos com todos os limites (Medicina)', () => {
    expect(read('estrutura-medicina-2024-1.html').groups).toEqual([
      expect.objectContaining({
        name: 'INTERNATO MÉDICO COM RECESSO',
        minHours: null,
        maxHours: null,
        minComponents: 2,
        maxComponents: 2,
      }),
      expect.objectContaining({
        name: 'INTERNATO MÉDICO SEM RECESSO',
        minComponents: 4,
        maxComponents: 4,
      }),
    ])
  })

  it('lê os membros dos grupos', () => {
    const [atelie] = read(
      'estrutura-arquitetura-e-urbanismo-2023-1.html',
    ).groups
    expect(atelie).toMatchObject({
      name: 'ATELIÊ DE PROJETO ARQUITETÔNICO',
      minHours: 256,
      maxHours: null,
    })
    expect(atelie?.members).toHaveLength(8)
    expect(atelie?.members[0]).toBe('IAUD0192')
  })

  it('lê as ênfases com código, cargas e membros', () => {
    const emphases = read(
      'estrutura-engenharia-metalurgica-2023-1.html',
    ).emphases
    expect(emphases.map((item) => item.sigaaCode)).toEqual([
      '2023.1E2',
      '2023.1E4',
      '2023.1E1',
      '2023.1E3',
    ])
    expect(emphases[0]).toMatchObject({
      name: 'EIXO DE GESTÃO E EMPREENDEDORISMO',
      mandatoryHours: 0,
      minOptativeHours: 224,
      groups: [],
    })
    expect(emphases[0]?.members[0]).toEqual({
      code: 'TK0235',
      natureLabel: 'Optativa (Ênfase)',
    })
  })

  it('lê obrigatórias da ênfase e grupos dentro da ênfase (Psicologia)', () => {
    const [clinica, psicossocial] = read(
      'estrutura-psicologia-2025-1.html',
    ).emphases
    expect(clinica).toMatchObject({
      sigaaCode: '2026.1E1',
      mandatoryHours: 544,
      minOptativeHours: 112,
    })
    expect(clinica?.members).toContainEqual({
      code: 'PSI0209',
      natureLabel: 'Obrigatória (Ênfase)',
    })
    expect(clinica?.groups.map((group) => group.name)).toEqual([
      'PSICOPATOLOGIA',
      'TEORIAS E TÉCNICAS PSICOTERÁPICAS',
    ])
    expect(clinica?.groups[0]).toMatchObject({
      minHours: 48,
      minComponents: 1,
      members: ['PSI0204', 'PSI0205', 'PSI0203'],
    })
    expect(psicossocial?.groups).toEqual([])
    expect(read('estrutura-psicologia-2025-1.html').groups).toEqual([])
  })
})
