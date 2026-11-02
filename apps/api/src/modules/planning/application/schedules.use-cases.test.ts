import { describe, expect, it } from 'vitest'

import { SteppingClock } from '../../catalog/application/testing/in-memory-catalog'
import {
  DeleteScheduleUseCase,
  ImportSchedulesUseCase,
  ListSchedulesUseCase,
  SaveScheduleUseCase,
} from './schedules.use-cases'
import {
  InMemoryPlanning,
  type StoredSection,
} from './testing/in-memory-planning'

const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'
const OTHER_ID = '7c1f2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f'

const section = (
  id: string,
  subjectCode: string,
  weekday: 1 | 2 | 3 | 4 | 5,
  overrides: Partial<StoredSection> = {},
): StoredSection => ({
  id,
  termId: 't-26-2',
  subjectCode,
  subjectName: `NOME ${subjectCode}`,
  sectionCode: '01',
  slots: [{ weekday, startTime: '08:00', endTime: '10:00' }],
  fingerprint: `fp-${id}`,
  removed: false,
  instructors: [{ siape: '9000001', name: 'DOCENTE 1', profileUrl: '/d1' }],
  validFrom: '2026-08-10',
  validTo: '2026-12-11',
  ...overrides,
})

function harness() {
  const store = new InMemoryPlanning()
  const clock = new SteppingClock('2026-11-02T12:00:00.000Z')
  store.courses = [
    { id: 'c-eng', slug: 'engenharia-de-computacao', isActive: true },
    { id: 'c-old', slug: 'antigo', isActive: false },
  ]
  store.curricula = [
    { id: 'ec-2006', courseId: 'c-eng', slug: '2006-2', published: true },
    { id: 'ec-2025', courseId: 'c-eng', slug: '2025-1', published: true },
    { id: 'ec-rasc', courseId: 'c-eng', slug: '2027-1', published: false },
  ]
  store.terms = [{ id: 't-26-2', code: '2026.2' }]
  for (const item of [
    section('s1', 'SBL0056', 1),
    section('s2', 'SBL0057', 2),
    section('s3', 'ECO0046', 1, { sectionCode: '02' }),
  ]) {
    store.sections.set(item.id, item)
  }
  return {
    store,
    list: new ListSchedulesUseCase(store),
    save: new SaveScheduleUseCase(store, clock),
    remove: new DeleteScheduleUseCase(store),
    importer: new ImportSchedulesUseCase(store, clock),
  }
}

const input = (overrides: Record<string, unknown> = {}) => ({
  courseSlug: 'engenharia-de-computacao',
  curriculumSlug: '2006-2',
  term: '2026.2',
  name: 'Agenda 1',
  position: 0,
  items: [{ sectionId: 's1', color: 'blue' as const }],
  ...overrides,
})

describe('agendas', () => {
  it('cria pelo id do cliente, regrava inteira e lista por EC', async () => {
    const h = harness()
    const created = await h.save.execute('u1', ID, input())
    expect(created).toMatchObject({
      id: ID,
      courseSlug: 'engenharia-de-computacao',
      curriculumSlug: '2006-2',
      term: '2026.2',
      items: [
        {
          sectionId: 's1',
          subjectName: 'NOME SBL0056',
          color: 'blue',
          changed: false,
          removed: false,
        },
      ],
    })
    const updated = await h.save.execute(
      'u1',
      ID,
      input({
        name: 'Plano A',
        items: [
          { sectionId: 's1', color: 'red' },
          { sectionId: 's2', color: 'lime' },
        ],
      }),
    )
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.updatedAt > created.updatedAt).toBe(true)
    expect(updated.items.map((item) => item.color)).toEqual(['red', 'lime'])

    // Mesmo curso, outra EC: agendas separadas (D71)
    await h.save.execute(
      'u1',
      OTHER_ID,
      input({ curriculumSlug: '2025-1', position: 1 }),
    )
    const list = (query: Record<string, string>) =>
      h.list.execute('u1', query).then((items) => items.map((item) => item.id))
    expect(await list({})).toEqual([ID, OTHER_ID])
    expect(
      await list({ course: 'engenharia-de-computacao', curriculum: '2025-1' }),
    ).toEqual([OTHER_ID])
    expect(await list({ term: '2026.2' })).toHaveLength(2)
    expect(await list({ course: 'nao-existe' })).toEqual([])
    expect(
      await list({ course: 'engenharia-de-computacao', curriculum: '1999-1' }),
    ).toEqual([])
    expect(await list({ term: '2030.1' })).toEqual([])
    expect(await h.list.execute('u2', {})).toEqual([])
  })

  it('avisa horário alterado e turma removida, e dispensa o aviso', async () => {
    const h = harness()
    await h.save.execute('u1', ID, input())
    h.store.sections.set(
      's1',
      section('s1', 'SBL0056', 3, { fingerprint: 'novo', removed: true }),
    )
    const [schedule] = await h.list.execute('u1', {})
    expect(schedule!.items[0]).toMatchObject({ changed: true, removed: true })
    const acknowledged = await h.save.execute(
      'u1',
      ID,
      input({
        items: [{ sectionId: 's1', color: 'blue', acknowledgeChange: true }],
      }),
    )
    expect(acknowledged.items[0]).toMatchObject({ changed: false })
  })

  it('recusa agenda alheia, contexto inválido e conflito', async () => {
    const h = harness()
    await h.save.execute('u1', ID, input())
    await expect(h.save.execute('u2', ID, input())).rejects.toMatchObject({
      code: 'SCHEDULE_NOT_FOUND',
    })
    await expect(
      h.save.execute('u1', OTHER_ID, input({ courseSlug: 'antigo' })),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' })
    await expect(
      h.save.execute('u1', OTHER_ID, input({ curriculumSlug: '2027-1' })),
    ).rejects.toMatchObject({ code: 'CURRICULUM_NOT_FOUND' })
    await expect(
      h.save.execute('u1', OTHER_ID, input({ term: '2030.1' })),
    ).rejects.toMatchObject({ code: 'TERM_NOT_FOUND' })
    await expect(
      h.save.execute(
        'u1',
        ID,
        input({
          items: [
            { sectionId: 's1', color: 'blue' },
            { sectionId: 's3', color: 'red' },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'SCHEDULE_TIME_CONFLICT' })
  })

  it('exclui só a própria agenda', async () => {
    const h = harness()
    await h.save.execute('u1', ID, input())
    await expect(h.remove.execute('u2', ID)).rejects.toMatchObject({
      code: 'SCHEDULE_NOT_FOUND',
    })
    await h.remove.execute('u1', ID)
    expect(await h.list.execute('u1', {})).toEqual([])
  })
})

describe('importação das agendas locais', () => {
  const entry = (overrides: Record<string, unknown> = {}) => ({
    id: ID,
    courseSlug: 'engenharia-de-computacao',
    curriculumSlug: '2006-2',
    term: '2026.2',
    name: 'Agenda local',
    items: [
      { subjectCode: 'SBL0056', sectionCode: '01', color: 'blue' as const },
      { subjectCode: 'ECO0046', sectionCode: '02', color: 'red' as const },
      { subjectCode: 'SBL0057', sectionCode: '09', color: 'teal' as const },
      { subjectCode: 'SBL0057', sectionCode: '01', color: 'lime' as const },
    ],
    ...overrides,
  })

  it('resolve pela chave natural, lista o que faltou e não duplica', async () => {
    const h = harness()
    const first = await h.importer.execute('u1', { schedules: [entry()] })
    expect(first.results[0]).toMatchObject({
      id: ID,
      status: 'IMPORTED',
      error: null,
      notFound: [{ subjectCode: 'SBL0057', sectionCode: '09' }],
      skipped: [
        {
          subjectCode: 'ECO0046',
          sectionCode: '02',
          reason: 'SCHEDULE_TIME_CONFLICT',
        },
      ],
    })
    expect(
      first.results[0]!.schedule!.items.map((item) => item.sectionId),
    ).toEqual(['s1', 's2'])

    const again = await h.importer.execute('u1', { schedules: [entry()] })
    expect(again.results[0]).toMatchObject({ status: 'ALREADY_IMPORTED' })
    expect(again.results[0]!.schedule!.id).toBe(ID)
    expect(h.store.schedules.size).toBe(1)
  })

  it('falha só a agenda com curso, EC ou semestre desconhecido', async () => {
    const h = harness()
    await h.importer.execute('u2', { schedules: [entry()] })
    const response = await h.importer.execute('u1', {
      schedules: [
        entry(),
        entry({ id: OTHER_ID, curriculumSlug: '1999-1' }),
        entry({ id: '3f2e1d0c-9b8a-4f6e-8d7c-6b5a4f3e2d1c', items: [] }),
      ],
    })
    expect(
      response.results.map((item) => [item.status, item.error?.code ?? null]),
    ).toEqual([
      ['FAILED', 'SCHEDULE_ID_TAKEN'],
      ['FAILED', 'CURRICULUM_NOT_FOUND'],
      ['IMPORTED', null],
    ])
    expect(response.results[2]!.schedule).toMatchObject({
      position: 2,
      items: [],
    })
  })
})
