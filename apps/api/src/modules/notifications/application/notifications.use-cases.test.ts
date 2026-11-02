import { describe, expect, it } from 'vitest'

import {
  SequentialIds,
  SteppingClock,
} from '../../catalog/application/testing/in-memory-catalog'
import {
  EventNotifier,
  GetNotificationPreferencesUseCase,
  ListNotificationsUseCase,
  MarkNotificationsReadUseCase,
  NotificationDispatcher,
  PurgeNotificationsUseCase,
  SetNotificationPreferencesUseCase,
  UnreadCountUseCase,
} from './notifications.use-cases'
import { InMemoryNotifications } from './testing/in-memory-notifications'

const AT = new Date('2026-11-02T12:00:00.000Z')
const HOUR = 60 * 60 * 1000

function harness() {
  const store = new InMemoryNotifications()
  const clock = new SteppingClock(AT.toISOString())
  const ids = new SequentialIds()
  const dispatcher = new NotificationDispatcher(store, clock, ids)
  store.admins = ['admin1', 'admin2']
  store.moderators.set('c1', ['mod1'])
  store.names.set('u1', 'Ana Souza')
  store.courses.set('c1', { name: 'Eng. de Computação', slug: 'eng-comp' })
  store.terms.set('t1', '2026.2')
  return {
    store,
    clock,
    notifier: new EventNotifier(store, dispatcher),
    list: new ListNotificationsUseCase(store),
    unread: new UnreadCountUseCase(store),
    markRead: new MarkNotificationsReadUseCase(store, clock),
    getPrefs: new GetNotificationPreferencesUseCase(store),
    setPrefs: new SetNotificationPreferencesUseCase(store, clock),
    purge: new PurgeNotificationsUseCase(store, clock),
  }
}

const of = (h: ReturnType<typeof harness>, userId: string) =>
  [...h.store.notifications.values()].filter((item) => item.userId === userId)

describe('eventos viram notificações', () => {
  it('solicitação de moderação avisa os admins; a resposta, quem pediu', async () => {
    const h = harness()
    await h.notifier.handle({
      type: 'ModeratorRequestCreated',
      requestId: 'q1',
      userId: 'u1',
      courseId: 'c1',
      occurredAt: AT,
    })
    expect(of(h, 'admin1')).toEqual([
      expect.objectContaining({
        type: 'MODERATOR_REQUEST_CREATED',
        actorId: 'u1',
        entityId: 'q1',
        data: {
          requestId: 'q1',
          requesterName: 'Ana Souza',
          courseName: 'Eng. de Computação',
        },
      }),
    ])
    expect(of(h, 'admin2')).toHaveLength(1)

    await h.notifier.handle({
      type: 'ModeratorRequestReviewed',
      requestId: 'q1',
      userId: 'u1',
      courseId: 'c1',
      reviewerId: 'admin1',
      decision: 'APPROVED',
      note: null,
      occurredAt: AT,
    })
    expect(of(h, 'u1')[0]).toMatchObject({
      type: 'MODERATOR_REQUEST_REVIEWED',
      data: { decision: 'APPROVED', courseSlug: 'eng-comp' },
    })
  })

  it('admin que pede não é avisado do próprio pedido', async () => {
    const h = harness()
    await h.notifier.handle({
      type: 'ModeratorRequestCreated',
      requestId: 'q1',
      userId: 'admin1',
      courseId: 'c1',
      occurredAt: AT,
    })
    expect(of(h, 'admin1')).toEqual([])
    expect(of(h, 'admin2')).toHaveLength(1)
  })

  it('falhas seguidas da coleta e importações pendentes se agrupam', async () => {
    const h = harness()
    const failed = {
      type: 'ScrapeFailed' as const,
      runId: 'r1',
      courseId: 'c1',
      termId: 't1',
      error: 'SIGAA respondeu 503',
      actorId: null,
      occurredAt: AT,
    }
    await h.notifier.handle(failed)
    h.clock.advance(6 * HOUR)
    await h.notifier.handle({ ...failed, runId: 'r2', error: 'Tempo esgotado' })
    expect(of(h, 'mod1')).toEqual([
      expect.objectContaining({
        entityId: 'r2',
        data: expect.objectContaining({
          failures: 2,
          error: 'Tempo esgotado',
          term: '2026.2',
        }),
      }),
    ])
    // Lida, a próxima falha abre outra
    await h.markRead.execute('mod1', { all: true })
    await h.notifier.handle({ ...failed, runId: 'r3' })
    expect(of(h, 'mod1')).toHaveLength(2)

    const pending = {
      type: 'CurriculumImportPending' as const,
      importId: 'i1',
      sigaaId: '657494',
      courseName: 'MEDICINA',
      importedBy: 'mod1',
      occurredAt: AT,
    }
    await h.notifier.handle(pending)
    await h.notifier.handle({ ...pending, importId: 'i2' })
    expect(
      of(h, 'admin1').filter((item) => item.type === 'IMPORT_PENDING'),
    ).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ importId: 'i2', imports: 2 }),
      }),
    ])
  })

  it('mudança na coleta avisa quem tem a turma na agenda', async () => {
    const h = harness()
    h.store.holders = [
      {
        userId: 'u1',
        sectionId: 's1',
        subjectCode: 'SBL0082',
        subjectName: 'MICROPROCESSADORES',
        sectionCode: '01',
        term: '2026.2',
        courseId: 'c1',
        courseSlug: 'eng-comp',
        curriculumSlug: '2006-2',
        scheduleName: 'Meu cronograma',
      },
    ]
    const delivered = await h.notifier.handle({
      type: 'SectionsChanged',
      termId: 't1',
      changedSectionIds: ['s1'],
      removedSectionIds: [],
      occurredAt: AT,
    })
    expect(delivered).toBe(1)
    expect(of(h, 'u1')[0]).toMatchObject({
      type: 'SCHEDULE_SECTION_CHANGED',
      groupKey: 'section-changed:s1',
      data: { scheduleNames: ['Meu cronograma'] },
    })
  })

  it('tipo silenciado não é gravado', async () => {
    const h = harness()
    await h.setPrefs.execute('admin2', {
      muted: ['MODERATOR_REQUEST_CREATED', 'MODERATOR_REQUEST_CREATED'],
    })
    expect(await h.getPrefs.execute('admin2')).toEqual({
      muted: ['MODERATOR_REQUEST_CREATED'],
    })
    expect(await h.getPrefs.execute('admin1')).toEqual({ muted: [] })
    await h.notifier.handle({
      type: 'ModeratorRequestCreated',
      requestId: 'q1',
      userId: 'u1',
      courseId: 'c1',
      occurredAt: AT,
    })
    expect(of(h, 'admin2')).toEqual([])
    expect(of(h, 'admin1')).toHaveLength(1)
  })
})

describe('lista, contador, leitura e retenção', () => {
  async function withFive() {
    const h = harness()
    for (let index = 1; index <= 5; index++) {
      await h.notifier.handle({
        type: 'ModeratorRequestCreated',
        requestId: `q${index}`,
        userId: 'u1',
        courseId: 'c1',
        occurredAt: AT,
      })
      h.clock.advance(HOUR)
    }
    return h
  }

  it('pagina do mais recente ao mais antigo e filtra não lidas', async () => {
    const h = await withFive()
    const first = await h.list.execute('admin1', { limit: 2 })
    expect(
      first.items.map((item) => (item.data as { requestId: string }).requestId),
    ).toEqual(['q5', 'q4'])
    const second = await h.list.execute('admin1', {
      limit: 2,
      cursor: first.nextCursor!,
    })
    expect(
      second.items.map(
        (item) => (item.data as { requestId: string }).requestId,
      ),
    ).toEqual(['q3', 'q2'])
    expect(await h.unread.execute('admin1')).toEqual({ count: 5 })

    await h.markRead.execute('admin1', { ids: [first.items[0]!.id] })
    expect(await h.unread.execute('admin1')).toEqual({ count: 4 })
    const unread = await h.list.execute('admin1', { limit: 20, unread: true })
    expect(unread.items).toHaveLength(4)
    expect(unread.nextCursor).toBeNull()
    // Marcar a notificação de outra pessoa não faz nada
    await h.markRead.execute('admin2', { ids: [unread.items[0]!.id] })
    expect(await h.unread.execute('admin1')).toEqual({ count: 4 })
  })

  it('apaga só as lidas há mais de 90 dias', async () => {
    const h = await withFive()
    await h.markRead.execute('admin1', { all: true })
    h.clock.advance(91 * 24 * HOUR)
    await h.markRead.execute('admin2', { all: true })
    expect(await h.purge.execute()).toBe(5)
    expect(of(h, 'admin1')).toEqual([])
    expect(of(h, 'admin2')).toHaveLength(5)
  })
})
