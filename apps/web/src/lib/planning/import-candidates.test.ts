import { describe, expect, it } from 'vitest'

import type { ScheduledClass } from '@/types/class'
import type { Course } from '@/types/course'
import type { Schedule } from '@/types/schedule'

import { findImportCandidates, missingClasses } from './import-candidates'

const ID = (n: number) => `0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a1${n}`

const cls = (code: string, sectionId = '01'): ScheduledClass => ({
  id: `${code}-${sectionId}`,
  term: '2026.2',
  sectionId,
  instructors: [],
  reservedSeats: 0,
  schedule: [],
  validity: { startDate: '', endDate: '' },
  code,
  name: code,
  color: 'blue',
})

const schedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: ID(1),
  courseId: '2006.2',
  year: 2026,
  semester: 2,
  name: 'Meu cronograma',
  createdAt: 1,
  updatedAt: 1,
  classes: [cls('ECO0001'), cls('ECO0002')],
  ...overrides,
})

const course = (slug: string, name: string, codes: string[]): Course => ({
  id: slug,
  slug,
  name,
  icon: 'cpu',
  curriculumStructures: [
    {
      id: '2006.2',
      period: '2006.2',
      slug: '2006-2',
      city: 'Sobral',
      branchs: [],
      subjects: codes.map((code) => ({ code })) as never,
    } as never,
  ],
})

const courses = [
  course('engenharia-eletrica', 'Engenharia Elétrica', ['ECO0001']),
  course('engenharia-de-computacao', 'Engenharia de Computação', [
    'ECO0001',
    'ECO0002',
  ]),
  course('psicologia', 'Psicologia', []),
]

describe('findImportCandidates', () => {
  it('agenda com curso gravado não pergunta nada', () => {
    const [candidate] = findImportCandidates(
      [
        schedule({
          courseSlug: 'engenharia-de-computacao',
          curriculumSlug: '2006-2',
        }),
      ],
      courses,
    )
    expect(candidate).toMatchObject({
      term: '2026.2',
      ambiguous: false,
      options: [
        {
          courseSlug: 'engenharia-de-computacao',
          curriculumSlug: '2006-2',
          courseName: 'Engenharia de Computação',
        },
      ],
    })
  })

  it('EC antiga em vários cursos: opções pelas turmas que batem', () => {
    const [candidate] = findImportCandidates([schedule()], courses)
    expect(candidate!.ambiguous).toBe(true)
    expect(
      candidate!.options.map((item) => [item.courseSlug, item.matches]),
    ).toEqual([
      ['engenharia-de-computacao', 2],
      ['engenharia-eletrica', 1],
      ['psicologia', 0],
    ])
  })

  it('ignora agenda vazia, id que não é UUID e EC desconhecida', () => {
    expect(
      findImportCandidates(
        [
          schedule({ classes: [] }),
          schedule({ id: 'agenda-antiga' }),
          schedule({ courseId: '1999.1' }),
        ],
        courses,
      ),
    ).toEqual([])
  })
})

describe('missingClasses', () => {
  it('conta as turmas que o semestre coletado não tem', () => {
    const local = schedule({ classes: [cls('ECO0001'), cls('ECO0002', '02')] })
    expect(
      missingClasses(local, new Set(['ECO0001|01', 'ECO0002|01'])),
    ).toEqual(['ECO0002'])
  })
})
