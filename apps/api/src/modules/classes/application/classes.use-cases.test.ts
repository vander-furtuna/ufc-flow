import { describe, expect, it, vi } from 'vitest'

import type { Actor } from '../../../shared/domain/access-policy'
import {
  SequentialIds,
  SteppingClock,
} from '../../catalog/application/testing/in-memory-catalog'
import type { ScrapedSection } from '../domain/section'
import {
  CollectAllSectionsUseCase,
  CollectSectionsUseCase,
  CreateTermUseCase,
  DeleteTermUseCase,
  GetCurrentTermUseCase,
  ListCourseSectionsUseCase,
  ListTermsUseCase,
  MarkCurrentTermUseCase,
  UpdateTermUseCase,
} from './classes.use-cases'
import { FakeSectionSource, InMemoryClasses } from './testing/in-memory-classes'

const actor = (overrides: Partial<Actor> = {}): Actor => ({
  userId: 'u1',
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(),
  ...overrides,
})
const admin = actor({ isAdmin: true })

const section = (overrides: Partial<ScrapedSection> = {}): ScrapedSection => ({
  subjectCode: 'SBL0056',
  subjectName: 'ÁLGEBRA LINEAR',
  sectionCode: '01',
  instructors: [{ siape: '9000001', name: 'DOCENTE 1', profileUrl: '/d1' }],
  reservedSeats: 60,
  slots: [{ weekday: 1, startTime: '08:00', endTime: '10:00' }],
  validFrom: '2026-08-10',
  validTo: '2026-12-11',
  ...overrides,
})

function harness() {
  const store = new InMemoryClasses()
  const clock = new SteppingClock('2026-11-02T12:00:00.000Z')
  const ids = new SequentialIds()
  const source = new FakeSectionSource()
  const pause = vi.fn(async () => undefined)
  store.courses = [
    {
      id: 'c-eng',
      slug: 'engenharia-de-computacao',
      sigaaId: '657484',
      isActive: true,
    },
    {
      id: 'c-ele',
      slug: 'engenharia-eletrica',
      sigaaId: '657485',
      isActive: true,
    },
    { id: 'c-old', slug: 'antigo', sigaaId: '1', isActive: false },
  ]
  const collect = new CollectSectionsUseCase(store, clock, ids, source)
  return {
    store,
    source,
    pause,
    listTerms: new ListTermsUseCase(store),
    current: new GetCurrentTermUseCase(store),
    createTerm: new CreateTermUseCase(store, ids),
    updateTerm: new UpdateTermUseCase(store),
    markCurrent: new MarkCurrentTermUseCase(store),
    deleteTerm: new DeleteTermUseCase(store),
    sections: new ListCourseSectionsUseCase(store),
    collect,
    collectAll: new CollectAllSectionsUseCase(store, clock, collect, pause, {
      pauseMs: 5000,
    }),
  }
}

async function withTerm() {
  const h = harness()
  await h.createTerm.execute(admin, {
    code: '2026.2',
    startsAt: '2026-08-10',
    endsAt: '2026-12-11',
  })
  await h.markCurrent.execute(admin, '2026.2')
  return h
}

describe('semestres letivos', () => {
  it('admin cadastra, marca o vigente, ajusta datas e lista', async () => {
    const h = harness()
    await expect(h.current.execute()).rejects.toMatchObject({
      code: 'TERM_CURRENT_NOT_SET',
    })
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
    expect(await h.current.execute()).toMatchObject({
      code: '2026.2',
      isCurrent: true,
    })
    const updated = await h.updateTerm.execute(admin, '2026.2', {
      startsAt: '2026-08-17',
      endsAt: '2026-12-18',
    })
    expect(updated).toMatchObject({ startsAt: '2026-08-17', isCurrent: true })
    expect(
      (await h.listTerms.execute()).map((term) => [term.code, term.isCurrent]),
    ).toEqual([
      ['2026.2', true],
      ['2026.1', false],
    ])
  })

  it('recusa repetido, inexistente, quem não é admin e exclusão com turmas', async () => {
    const h = await withTerm()
    await expect(
      h.createTerm.execute(admin, {
        code: '2026.2',
        startsAt: '2026-08-10',
        endsAt: '2026-12-11',
      }),
    ).rejects.toMatchObject({ code: 'TERM_ALREADY_EXISTS' })
    await expect(h.markCurrent.execute(admin, '2030.1')).rejects.toMatchObject({
      code: 'TERM_NOT_FOUND',
    })
    expect(() =>
      h.createTerm.execute(actor(), {
        code: '2027.1',
        startsAt: '2027-03-01',
        endsAt: '2027-07-01',
      }),
    ).toThrow(expect.objectContaining({ code: 'ACCESS_DENIED' }))
    h.source.responses.set('657484', [section()])
    await h.collect.execute(
      null,
      '2026.2',
      'engenharia-de-computacao',
      'SCHEDULED',
    )
    await expect(h.deleteTerm.execute(admin, '2026.2')).rejects.toMatchObject({
      code: 'TERM_HAS_SECTIONS',
    })
    await h.createTerm.execute(admin, {
      code: '2027.1',
      startsAt: '2027-03-01',
      endsAt: '2027-07-01',
    })
    await h.deleteTerm.execute(admin, '2027.1')
    expect((await h.listTerms.execute()).map((term) => term.code)).toEqual([
      '2026.2',
    ])
  })
})

describe('coleta e turmas do curso', () => {
  it('coleta, guarda ids estáveis e mostra as turmas do curso', async () => {
    const h = await withTerm()
    h.source.responses.set('657484', [
      section(),
      section({ sectionCode: '02', reservedSeats: 20 }),
      section({ subjectCode: 'ECO0046', subjectName: 'ALGORITMOS EM GRAFOS' }),
    ])
    const run = await h.collect.execute(
      null,
      '2026.2',
      'engenharia-de-computacao',
      'SCHEDULED',
    )
    expect(run).toMatchObject({
      status: 'SUCCESS',
      courseSlug: 'engenharia-de-computacao',
      term: '2026.2',
      trigger: 'SCHEDULED',
      sectionsSeen: 3,
      sectionsChanged: 3,
    })
    const first = await h.sections.execute('2026.2', 'engenharia-de-computacao')
    expect(first.collectedAt).toBe(run.finishedAt)
    expect(
      first.subjects.map((subject) => [subject.code, subject.sections.length]),
    ).toEqual([
      ['ECO0046', 1],
      ['SBL0056', 2],
    ])
    expect(first.subjects[1]!.sections[1]).toMatchObject({
      sectionCode: '02',
      reservedSeats: 20,
    })

    // Segunda coleta: mesmos ids, nada mudou
    const again = await h.collect.execute(
      null,
      '2026.2',
      'engenharia-de-computacao',
      'SCHEDULED',
    )
    expect(again.sectionsChanged).toBe(0)
    const second = await h.sections.execute(
      '2026.2',
      'engenharia-de-computacao',
    )
    expect(
      second.subjects.flatMap((subject) =>
        subject.sections.map((item) => item.id),
      ),
    ).toEqual(
      first.subjects.flatMap((subject) =>
        subject.sections.map((item) => item.id),
      ),
    )
  })

  it('turma que some sai do curso e só é removida quando nenhum curso a oferta', async () => {
    const h = await withTerm()
    h.source.responses.set('657484', [
      section(),
      section({ sectionCode: '02' }),
    ])
    h.source.responses.set('657485', [section({ reservedSeats: 10 })])
    await h.collect.execute(
      null,
      '2026.2',
      'engenharia-de-computacao',
      'SCHEDULED',
    )
    await h.collect.execute(null, '2026.2', 'engenharia-eletrica', 'SCHEDULED')

    h.source.responses.set('657484', [])
    await h.collect.execute(
      null,
      '2026.2',
      'engenharia-de-computacao',
      'SCHEDULED',
    )
    expect(
      (await h.sections.execute('2026.2', 'engenharia-de-computacao')).subjects,
    ).toEqual([])
    const removed = [...h.store.sections.values()].filter(
      (item) => item.removedAt !== null,
    )
    expect(removed.map((item) => item.sectionCode)).toEqual(['02'])
    expect(
      (await h.sections.execute('2026.2', 'engenharia-eletrica')).subjects[0]!
        .sections[0],
    ).toMatchObject({ sectionCode: '01', reservedSeats: 10 })
  })

  it('falha do SIGAA fica registrada sem mexer nas turmas', async () => {
    const h = await withTerm()
    h.source.responses.set('657484', new Error('SIGAA respondeu 503'))
    const run = await h.collect.execute(
      null,
      '2026.2',
      'engenharia-de-computacao',
      'SCHEDULED',
    )
    expect(run).toMatchObject({
      status: 'FAILED',
      error: 'SIGAA respondeu 503',
    })
    expect(
      (await h.sections.execute('2026.2', 'engenharia-de-computacao'))
        .collectedAt,
    ).toBeNull()
  })

  it('disparo manual: moderador do curso ou admin', async () => {
    const h = await withTerm()
    const moderator = actor({ moderatedCourseIds: new Set(['c-eng']) })
    expect(
      (
        await h.collect.execute(
          moderator,
          '2026.2',
          'engenharia-de-computacao',
          'MANUAL',
        )
      ).trigger,
    ).toBe('MANUAL')
    await expect(
      h.collect.execute(moderator, '2026.2', 'engenharia-eletrica', 'MANUAL'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    await expect(
      h.collect.execute(admin, '2026.2', 'nao-existe', 'MANUAL'),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' })
    await expect(h.sections.execute('2026.2', 'antigo')).rejects.toMatchObject({
      code: 'COURSE_NOT_FOUND',
    })
    await expect(h.sections.execute('1999.1', 'antigo')).rejects.toMatchObject({
      code: 'TERM_NOT_FOUND',
    })
  })

  it('coleta agendada: cursos ativos, vigente e próximo na matrícula, com pausa', async () => {
    const h = await withTerm()
    await h.createTerm.execute(admin, {
      code: '2027.1',
      startsAt: '2026-12-01',
      endsAt: '2027-04-30',
    })
    const runs = await h.collectAll.execute()
    expect(runs.map((run) => `${run.term} ${run.courseSlug}`)).toEqual([
      '2026.2 engenharia-de-computacao',
      '2026.2 engenharia-eletrica',
      '2027.1 engenharia-de-computacao',
      '2027.1 engenharia-eletrica',
    ])
    expect(h.source.calls).toEqual([
      '657484@2026.2',
      '657485@2026.2',
      '657484@2027.1',
      '657485@2027.1',
    ])
    expect(h.pause).toHaveBeenCalledTimes(3)
    expect(h.pause).toHaveBeenCalledWith(5000)
  })
})
