import type { SigaaCourse } from '@ufc-flow/academic-core'
import { describe, expect, it } from 'vitest'

import catalog from './catalog/sigaa-courses.json'
import { resolveCourse } from './course'
import { readCurriculumPage } from './read-curriculum-page'
import { canExport, reviewImport } from './review'
import { loadFixture } from './test-utils'
import { toCurriculumImport } from './to-curriculum-import'

const courses = catalog as SigaaCourse[]

function reviewFixture(name: string, selectedCourseId: string | null = null) {
  const page = readCurriculumPage(loadFixture(name))
  if (!page) throw new Error(name)
  const course = resolveCourse({
    header: page.header,
    catalog: courses,
    selectedCourseId,
  })
  const conversion = toCurriculumImport(page, {
    course: {
      sigaaId: course.course?.sigaaId ?? '0',
      name: course.course?.name ?? 'Curso',
      recognition: course.recognition ?? 'MANUAL',
    },
    curriculumSigaaId: null,
    extractedAt: '2026-11-01T12:00:00Z',
    url: null,
  })
  return { page, conversion, items: reviewImport({ ...conversion, course }) }
}

const byId = (items: ReturnType<typeof reviewImport>, id: string) =>
  items.find((item) => item.id === id)

describe('reviewImport', () => {
  const { items } = reviewFixture(
    'estrutura-engenharia-de-computacao-2006-2.html',
  )

  it('mostra o curso reconhecido', () => {
    expect(byId(items, 'course')).toEqual({
      id: 'course',
      level: 'ok',
      title: 'Curso reconhecido pelo cabeçalho',
      detail: 'ENGENHARIA DE COMPUTAÇÃO · SOBRAL · código SIGAA 657484',
    })
  })

  it('mostra o curso selecionado na busca do SIGAA', () => {
    const selected = reviewFixture(
      'estrutura-engenharia-de-computacao-2006-2.html',
      '657484',
    ).items
    expect(byId(selected, 'course')?.title).toBe(
      'Curso selecionado na busca do SIGAA',
    )
  })

  it('conta componentes, períodos e naturezas', () => {
    expect(byId(items, 'components')).toEqual({
      id: 'components',
      level: 'ok',
      title: '114 componentes em 10 períodos',
      detail: '39 obrigatórias · 75 optativas',
    })
  })

  it('resume os requisitos lidos como expressão', () => {
    expect(byId(items, 'requirements')).toEqual({
      id: 'requirements',
      level: 'ok',
      title: 'Requisitos lidos como expressão',
      detail:
        '87 disciplinas com pré-requisito · 6 usam OU · nenhum ciclo encontrado',
    })
  })

  it('avisa os códigos citados fora da estrutura', () => {
    expect(byId(items, 'outside')).toEqual({
      id: 'outside',
      level: 'warning',
      title: '4 códigos citados fora desta estrutura',
      detail:
        'Aparecem em pré ou co-requisitos. Vão como código, e o Flow liga quando forem importados.',
      codes: ['ECO0004', 'ECO0024', 'ECO0027', 'EEL0072'],
    })
  })

  it('diz quando não há vertentes', () => {
    expect(byId(items, 'branches')).toMatchObject({
      level: 'ok',
      title: 'Sem ênfases nem grupos',
    })
    expect(canExport(items)).toBe(true)
  })

  it('lista ênfases e grupos', () => {
    const psicologia = reviewFixture('estrutura-psicologia-2025-1.html').items
    expect(byId(psicologia, 'branches')).toEqual({
      id: 'branches',
      level: 'ok',
      title: '2 ênfases e 2 grupos',
      detail:
        'PROCESSOS CLÍNICOS E ATENÇÃO À SAÚDE, PSICOPATOLOGIA, TEORIAS E TÉCNICAS PSICOTERÁPICAS, PROCESSOS PSICOSSOCIAIS E CONSTRUÇÃO DA REALIDADE',
    })
    expect(byId(psicologia, 'outside')).toBeUndefined()
  })

  it('bloqueia a exportação sem curso decidido', () => {
    const { conversion, page } = reviewFixture(
      'estrutura-engenharia-de-computacao-2006-2.html',
    )
    const course = resolveCourse({
      header: {
        ...page.header,
        matrixName: 'CURSO NOVO - SOBRAL - Presencial',
      },
      catalog: courses,
      selectedCourseId: null,
    })
    const review = reviewImport({ ...conversion, course })
    expect(byId(review, 'course')).toEqual({
      id: 'course',
      level: 'error',
      title: 'Escolha o curso desta estrutura',
      detail: '9 cursos possíveis na mesma cidade',
    })
    expect(canExport(review)).toBe(false)
  })

  it('avisa ciclo de pré-requisitos', () => {
    const { conversion, items: base } = reviewFixture(
      'estrutura-matematica-2024-1.html',
    )
    const [first, second, ...rest] = conversion.data!.subjects
    const cyclic = {
      ...conversion,
      data: {
        ...conversion.data!,
        subjects: [
          {
            ...first!,
            prerequisites: { kind: 'subject' as const, code: second!.code },
          },
          {
            ...second!,
            prerequisites: { kind: 'subject' as const, code: first!.code },
          },
          ...rest,
        ],
      },
    }
    const course = resolveCourse({
      header: {
        matrixName: 'MATEMÁTICA - LICENCIATURA - FORTALEZA - Presencial',
        unitName: null,
        city: 'FORTALEZA - CE',
      },
      catalog: courses,
      selectedCourseId: null,
    })
    expect(byId(base, 'requirements')?.level).toBe('ok')
    expect(
      byId(reviewImport({ ...cyclic, course }), 'requirements'),
    ).toMatchObject({
      level: 'warning',
      detail: expect.stringContaining(
        `ciclo: ${first!.code} ↔ ${second!.code}`,
      ),
    })
  })

  it('mostra o que a extensão não entendeu', () => {
    const { conversion, items: base } = reviewFixture(
      'estrutura-engenharia-de-computacao-2006-2.html',
    )
    const course = resolveCourse({
      header: readCurriculumPage(
        loadFixture('estrutura-engenharia-de-computacao-2006-2.html'),
      )!.header,
      catalog: courses,
      selectedCourseId: null,
    })
    const review = reviewImport({
      ...conversion,
      course,
      warnings: [
        {
          code: 'REQUIREMENT_UNREADABLE',
          subjectCode: 'ECO0015',
          field: 'prerequisites',
          text: '( X OU )',
          message: 'x',
        },
        {
          code: 'UNKNOWN_SUBJECT_TYPE',
          subjectCode: 'ECO0016',
          text: 'NOVO',
          message: 'x',
        },
      ],
    })
    expect(byId(base, 'unreadable-requirements')).toBeUndefined()
    expect(byId(review, 'unreadable-requirements')).toMatchObject({
      level: 'warning',
      codes: ['ECO0015'],
    })
    expect(byId(review, 'unknown-types')).toMatchObject({
      level: 'warning',
      codes: ['ECO0016'],
    })
  })

  it('mostra a falha de validação e para por aí', () => {
    const { page } = reviewFixture('estrutura-matematica-2024-1.html')
    const conversion = toCurriculumImport(
      { ...page, header: { ...page.header, effectiveTerm: '20241' } },
      {
        course: { sigaaId: '1', name: 'x', recognition: 'MANUAL' },
        curriculumSigaaId: null,
        extractedAt: '2026-11-01T12:00:00Z',
        url: null,
      },
    )
    const course = resolveCourse({
      header: page.header,
      catalog: courses,
      selectedCourseId: null,
    })
    const review = reviewImport({ ...conversion, course })
    expect(review.map((item) => item.id)).toEqual(['course', 'validation'])
    expect(byId(review, 'validation')).toMatchObject({
      level: 'error',
      detail: expect.stringContaining('curriculum.effectiveTerm'),
    })
  })
})
