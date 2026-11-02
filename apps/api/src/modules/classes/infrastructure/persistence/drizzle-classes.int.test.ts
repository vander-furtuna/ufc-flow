import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  insertCourse,
  startDatabase,
  type TestDatabase,
} from '../../../../../test/support/database'
import { RecordingEventPublisher } from '../../../../shared/domain/events'
import { RandomIdGenerator } from '../../../../shared/infrastructure/random-id-generator'
import { SystemClock } from '../../../../shared/infrastructure/system-clock'
import { subjects } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { FakeSectionSource } from '../../application/testing/in-memory-classes'
import {
  CollectSectionsUseCase,
  CreateTermUseCase,
  DeleteTermUseCase,
  GetCurrentTermUseCase,
  ListCourseSectionsUseCase,
  MarkCurrentTermUseCase,
} from '../../application/classes.use-cases'
import type { ScrapedSection } from '../../domain/section'
import { classSections, instructors } from './classes.schema'
import { DrizzleClassesUnitOfWork } from './drizzle-classes'

let database: TestDatabase
const admin = {
  userId: randomUUID(),
  isAdmin: true,
  moderatedCourseIds: new Set<string>(),
  enrolledCourseIds: new Set<string>(),
}

const section = (overrides: Partial<ScrapedSection> = {}): ScrapedSection => ({
  subjectCode: 'SBL0056',
  subjectName: 'ÁLGEBRA LINEAR',
  sectionCode: '01',
  instructors: [
    { siape: '9000001', name: 'DOCENTE 1', profileUrl: '/d1' },
    { siape: '9000002', name: 'DOCENTE 2', profileUrl: '/d2' },
  ],
  reservedSeats: 60,
  slots: [
    { weekday: 3, startTime: '08:00', endTime: '10:00' },
    { weekday: 1, startTime: '08:00', endTime: '10:00' },
  ],
  validFrom: '2026-08-10',
  validTo: '2026-12-11',
  ...overrides,
})

function useCases(source: FakeSectionSource) {
  const uow = new DrizzleClassesUnitOfWork(database.db)
  const ids = new RandomIdGenerator()
  return {
    createTerm: new CreateTermUseCase(uow, ids),
    markCurrent: new MarkCurrentTermUseCase(uow),
    current: new GetCurrentTermUseCase(uow),
    deleteTerm: new DeleteTermUseCase(uow),
    sections: new ListCourseSectionsUseCase(uow),
    collect: new CollectSectionsUseCase(
      uow,
      new SystemClock(),
      ids,
      source,
      new RecordingEventPublisher(),
    ),
  }
}

beforeAll(async () => {
  database = await startDatabase()
})

afterAll(async () => {
  await database?.stop()
})

describe('turmas no PostgreSQL', () => {
  it('troca o vigente na mesma transação, respeitando o índice parcial', async () => {
    const h = useCases(new FakeSectionSource())
    await h.createTerm.execute(admin, {
      code: '2026.1',
      startsAt: '2026-03-02',
      endsAt: '2026-07-10',
    })
    await h.createTerm.execute(admin, {
      code: '2026.2',
      startsAt: '2026-08-10',
      endsAt: '2026-12-11',
    })
    await h.markCurrent.execute(admin, '2026.1')
    await h.markCurrent.execute(admin, '2026.2')
    expect((await h.current.execute()).code).toBe('2026.2')
    await expect(
      h.createTerm.execute(admin, {
        code: '2026.2',
        startsAt: '2026-08-10',
        endsAt: '2026-12-11',
      }),
    ).rejects.toMatchObject({ code: 'TERM_ALREADY_EXISTS' })
  })

  it('coleta grava turmas, docentes e ofertas, e recoleta sem trocar ids', async () => {
    const eng = await insertCourse(database.db)
    const ele = await insertCourse(database.db)
    await database.db.insert(subjects).values({
      id: randomUUID(),
      code: 'SBL0056',
      name: 'ÁLGEBRA LINEAR',
      slug: 'algebra-linear',
      searchName: 'algebra linear',
      type: 'DISCIPLINE',
      workloadHours: 64,
      theoryHours: 64,
      labHours: 0,
      eadHours: 0,
      extensionHours: 0,
      credits: 4,
    })
    const source = new FakeSectionSource()
    const h = useCases(source)
    source.responses.set(eng.sigaaId, [
      section(),
      section({ sectionCode: '02', reservedSeats: 15 }),
      section({
        subjectCode: 'ECO9999',
        subjectName: 'FORA DO CATÁLOGO',
        instructors: [],
      }),
    ])
    source.responses.set(ele.sigaaId, [section({ reservedSeats: 5 })])

    const run = await h.collect.execute(null, '2026.2', eng.slug, 'SCHEDULED')
    expect(run).toMatchObject({ status: 'SUCCESS', sectionsChanged: 3 })
    await h.collect.execute(null, '2026.2', ele.slug, 'SCHEDULED')

    const first = await h.sections.execute('2026.2', eng.slug)
    expect(first.collectedAt).toBe(run.finishedAt)
    const algebra = first.subjects.find((item) => item.code === 'SBL0056')!
    expect(algebra.sections[0]).toMatchObject({
      sectionCode: '01',
      reservedSeats: 60,
      instructors: [{ siape: '9000001' }, { siape: '9000002' }],
      slots: [
        { weekday: 1, startTime: '08:00', endTime: '10:00' },
        { weekday: 3, startTime: '08:00', endTime: '10:00' },
      ],
      validFrom: '2026-08-10',
    })
    const rows = await database.db.select().from(classSections)
    expect(
      rows
        .map((row) => [row.subjectCode, row.subjectId !== null])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    ).toEqual([
      ['ECO9999', false],
      ['SBL0056', true],
      ['SBL0056', true],
    ])

    // Docente com nome corrigido; turma 02 some só deste curso
    source.responses.set(eng.sigaaId, [
      section({
        instructors: [
          { siape: '9000001', name: 'DOCENTE UM', profileUrl: '/d1' },
        ],
      }),
    ])
    const again = await h.collect.execute(null, '2026.2', eng.slug, 'SCHEDULED')
    expect(again.sectionsChanged).toBe(1)
    const second = await h.sections.execute('2026.2', eng.slug)
    expect(second.subjects).toHaveLength(1)
    expect(second.subjects[0]!.sections[0]!.id).toBe(algebra.sections[0]!.id)
    const [renamed] = await database.db
      .select()
      .from(instructors)
      .where(eq(instructors.siape, '9000001'))
    expect(renamed!.name).toBe('DOCENTE UM')
    const removed = await database.db.select().from(classSections)
    expect(
      removed
        .filter((row) => row.removedAt !== null)
        .map((row) => `${row.subjectCode}-${row.sectionCode}`)
        .sort(),
    ).toEqual(['ECO9999-01', 'SBL0056-02'])
    expect(
      (await h.sections.execute('2026.2', ele.slug)).subjects[0]!.sections[0],
    ).toMatchObject({ reservedSeats: 5 })

    await expect(h.deleteTerm.execute(admin, '2026.2')).rejects.toMatchObject({
      code: 'TERM_HAS_SECTIONS',
    })
  })
})
