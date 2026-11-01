import type { SigaaCourse } from '@ufc-flow/academic-core'
import { sigaaCourseSchema } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import catalog from './catalog/sigaa-courses.json'
import { formatCourseName, mergeCatalog, resolveCourse } from './course'

const courses = catalog as SigaaCourse[]

const header = {
  matrixName:
    'ENGENHARIA DE COMPUTAÇÃO - SOBRAL - Presencial - MT - BACHARELADO',
  unitName: 'CAMPUS DA UFC EM SOBRAL (11.00.01.28)',
  city: 'SOBRAL - CE',
}

describe('catálogo embutido', () => {
  it('tem os 170 cursos da lista pública, todos válidos', () => {
    expect(courses).toHaveLength(170)
    for (const course of courses) {
      expect(sigaaCourseSchema.safeParse(course).success).toBe(true)
    }
  })
})

describe('formatCourseName', () => {
  it.each([
    ['ENGENHARIA DE COMPUTAÇÃO', 'Engenharia de Computação'],
    ['GESTÃO DE POLÍTICAS PÚBLICAS', 'Gestão de Políticas Públicas'],
    ['ARQUITETURA E URBANISMO', 'Arquitetura e Urbanismo'],
    ['MÚSICA-LICENCIATURA', 'Música-Licenciatura'],
    ['MATEMÁTICA - LICENCIATURA', 'Matemática - Licenciatura'],
    ['ADMINISTRAÇÃO (DIURNO)', 'Administração (Diurno)'],
    ['DE OLHO NO MAR', 'De Olho no Mar'],
    ['FÍSICA GERAL III', 'Física Geral III'],
    ['CÁLCULO DIFERENCIAL E INTEGRAL II', 'Cálculo Diferencial e Integral II'],
    ['TÓPICOS ESPECIAIS IV', 'Tópicos Especiais IV'],
    ['PRÁTICA DE ENSINO I', 'Prática de Ensino I'],
  ])('%s → %s', (name, formatted) => {
    expect(formatCourseName(name)).toBe(formatted)
  })
})

describe('mergeCatalog', () => {
  it('acrescenta ao embutido os cursos novos lidos do select', () => {
    const novo: SigaaCourse = {
      sigaaId: '99',
      name: 'CURSO NOVO',
      city: 'SOBRAL',
      modality: null,
      unitAcronym: 'CUFCSOBRAL',
      unitName: null,
    }
    const merged = mergeCatalog(courses, [courses[0]!, novo])
    expect(merged).toHaveLength(171)
    expect(merged.at(-1)).toEqual(novo)
  })

  it('mantém modalidade e unidade do embutido', () => {
    const fromSelect = { ...courses[0]!, modality: null, unitName: null }
    expect(mergeCatalog(courses, [fromSelect])[0]).toEqual(courses[0])
  })
})

describe('resolveCourse', () => {
  it('usa o curso selecionado na busca do SIGAA', () => {
    expect(
      resolveCourse({ header, catalog: courses, selectedCourseId: '657484' }),
    ).toMatchObject({
      recognition: 'SELECTED',
      course: { sigaaId: '657484' },
      candidates: [],
    })
  })

  it('reconhece pelo cabeçalho quando não há seleção', () => {
    expect(
      resolveCourse({ header, catalog: courses, selectedCourseId: null }),
    ).toMatchObject({ recognition: 'MATCHED', course: { sigaaId: '657484' } })
  })

  it('pede escolha quando a seleção e o cabeçalho discordam', () => {
    const result = resolveCourse({
      header,
      catalog: courses,
      selectedCourseId: '657420',
    })
    expect(result.course).toBeNull()
    expect(result.candidates.map((item) => item.sigaaId).sort()).toEqual([
      '657420',
      '657484',
    ])
  })

  it('a escolha manual vence', () => {
    expect(
      resolveCourse({
        header,
        catalog: courses,
        selectedCourseId: '657484',
        manualCourseId: '657420',
      }),
    ).toMatchObject({ recognition: 'MANUAL', course: { sigaaId: '657420' } })
  })

  it('ignora seleção e escolha que não estão no catálogo', () => {
    expect(
      resolveCourse({
        header,
        catalog: courses,
        selectedCourseId: '1',
        manualCourseId: '2',
      }),
    ).toMatchObject({ recognition: 'MATCHED', course: { sigaaId: '657484' } })
  })

  it('sem reconhecimento, devolve os candidatos', () => {
    const result = resolveCourse({
      header: { ...header, matrixName: 'CURSO NOVO - SOBRAL - Presencial' },
      catalog: courses,
      selectedCourseId: null,
    })
    expect(result.course).toBeNull()
    expect(result.recognition).toBeNull()
    expect(result.candidates).toHaveLength(9)
  })
})
