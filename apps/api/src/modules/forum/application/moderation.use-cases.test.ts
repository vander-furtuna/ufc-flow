import { describe, expect, it } from 'vitest'

import type { Actor } from '../../../shared/domain/access-policy'
import type { DomainError } from '../../../shared/domain/domain-error'
import { RecordingEventPublisher } from '../../../shared/domain/events'
import {
  SequentialIds,
  SteppingClock,
} from '../../catalog/application/testing/in-memory-catalog'
import { ReadForumUseCase, WriteForumUseCase } from './forum.use-cases'
import {
  ModerateMessageUseCase,
  ModerationQueueUseCase,
  ReportMessageUseCase,
  RestrictUserUseCase,
} from './moderation.use-cases'
import { InMemoryForum } from './testing/in-memory-forum'

const COURSE = 'c-eng'
const OTHER = 'c-ele'
const actor = (userId: string, overrides: Partial<Actor> = {}): Actor => ({
  userId,
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set([COURSE]),
  ...overrides,
})
const ANA = actor('ana')
const BRUNO = actor('bruno')
const CARLA = actor('carla')
const DIEGO = actor('diego')
const MOD = actor('mod', {
  enrolledCourseIds: new Set(),
  moderatedCourseIds: new Set([COURSE]),
})
const MOD_OTHER = actor('mod2', {
  enrolledCourseIds: new Set(),
  moderatedCourseIds: new Set([OTHER]),
})
const ADMIN = actor('admin', { isAdmin: true, enrolledCourseIds: new Set() })

function setup() {
  const store = new InMemoryForum()
  store.courses = [
    { id: COURSE, slug: 'eng', name: 'Engenharia', isActive: true },
    { id: OTHER, slug: 'ele', name: 'Elétrica', isActive: true },
  ]
  for (const name of [
    'ana',
    'bruno',
    'carla',
    'diego',
    'mod',
    'mod2',
    'admin',
  ]) {
    store.names.set(name, name[0]!.toUpperCase() + name.slice(1))
  }
  store.admins.add('admin')
  store.moderators.set(COURSE, ['mod'])
  store.pendingRequests = 2
  const clock = new SteppingClock('2026-11-03T12:00:00.000Z')
  const ids = new SequentialIds()
  const events = new RecordingEventPublisher()
  const limits = { burst: 100, burstSeconds: 10, hourly: 1000 }
  return {
    store,
    clock,
    events,
    read: new ReadForumUseCase(store, clock),
    write: new WriteForumUseCase(store, clock, ids, events, limits),
    report: new ReportMessageUseCase(store, clock, ids, events),
    moderate: new ModerateMessageUseCase(store, clock, ids, events),
    restrict: new RestrictUserUseCase(store, clock, ids, events),
    queue: new ModerationQueueUseCase(store, clock),
  }
}

const code = async (work: Promise<unknown>) => {
  try {
    await work
  } catch (error) {
    return (error as DomainError).code
  }
  return null
}

const lastEvent = (h: ReturnType<typeof setup>) => h.events.events.at(-1)

describe('denúncias', () => {
  it('uma por pessoa; a 3ª de pessoas diferentes oculta sozinha', async () => {
    const h = setup()
    const message = await h.write.post(ANA, 'eng', {
      content: 'O número da monitora é 9999',
    })
    await h.report.execute(BRUNO, message.id, {
      reason: 'PERSONAL_DATA',
      details: null,
    })
    expect(
      await code(
        h.report.execute(BRUNO, message.id, { reason: 'SPAM', details: null }),
      ),
    ).toBe('FORUM_ALREADY_REPORTED')
    expect(
      await code(
        h.report.execute(ANA, message.id, { reason: 'SPAM', details: null }),
      ),
    ).toBe('FORUM_CANNOT_REPORT_OWN')
    await h.report.execute(CARLA, message.id, {
      reason: 'HARASSMENT',
      details: 'Expõe a monitora',
    })
    expect(h.store.messages.get(message.id)!.status).toBe('VISIBLE')
    await h.report.execute(DIEGO, message.id, {
      reason: 'PERSONAL_DATA',
      details: null,
    })
    expect(h.store.messages.get(message.id)!.status).toBe('HIDDEN')
    expect(lastEvent(h)).toMatchObject({
      type: 'MessageModerated',
      action: 'HIDE',
      moderatorId: null,
      authorId: 'ana',
    })

    // Editar não apaga a prova
    const [item] = await h.queue.reports(MOD)
    expect(item).toMatchObject({
      snapshot: 'O número da monitora é 9999',
      autoHidden: true,
      reportCount: 3,
      reasons: expect.arrayContaining([
        { reason: 'PERSONAL_DATA', count: 2 },
        { reason: 'HARASSMENT', count: 1 },
      ]),
      details: ['Expõe a monitora'],
    })
  })
})

describe('ações na mensagem', () => {
  it('remover aceita as denúncias e mostra só a categoria', async () => {
    const h = setup()
    const message = await h.write.post(ANA, 'eng', { content: 'Telefone' })
    await h.write.reply(BRUNO, message.id, { content: 'Resposta' })
    await h.report.execute(BRUNO, message.id, {
      reason: 'PERSONAL_DATA',
      details: null,
    })
    expect(
      await code(
        h.moderate.execute(MOD_OTHER, message.id, {
          action: 'HIDE',
          reason: 'Outro curso',
        }),
      ),
    ).toBe('ACCESS_DENIED')
    await h.moderate.execute(MOD, message.id, {
      action: 'REMOVE',
      reason: 'Telefone da monitora',
      category: 'PERSONAL_DATA',
    })
    expect(h.store.reports[0]).toMatchObject({
      status: 'ACCEPTED',
      resolvedBy: 'mod',
    })
    expect(h.store.log.at(-1)).toMatchObject({
      action: 'REMOVE_MESSAGE',
      reason: 'Telefone da monitora',
      targetUserId: 'ana',
    })
    const [shown] = (await h.read.timeline(CARLA, 'eng', { limit: 5 })).items
    expect(shown).toMatchObject({
      content: null,
      removedBy: 'MODERATION',
      removalCategory: 'PERSONAL_DATA',
    })
    expect(lastEvent(h)).toMatchObject({
      action: 'REMOVE',
      category: 'PERSONAL_DATA',
    })
    expect(await h.queue.reports(MOD)).toEqual([])

    // Restaurar volta o texto
    const restored = await h.moderate.execute(ADMIN, message.id, {
      action: 'RESTORE',
      reason: 'Engano',
    })
    expect(restored).toMatchObject({ content: 'Telefone', status: 'VISIBLE' })
  })

  it('descartar as denúncias devolve a oculta ao ar', async () => {
    const h = setup()
    const message = await h.write.post(ANA, 'eng', { content: 'Vendo HP 50g' })
    for (const who of [BRUNO, CARLA, DIEGO]) {
      await h.report.execute(who, message.id, {
        reason: 'OFF_TOPIC',
        details: null,
      })
    }
    await h.moderate.dismiss(MOD, message.id, { reason: 'Pode vender' })
    expect(h.store.messages.get(message.id)!.status).toBe('VISIBLE')
    expect(h.store.reports.every((item) => item.status === 'DISMISSED')).toBe(
      true,
    )
    expect(
      await code(h.moderate.dismiss(MOD, message.id, { reason: 'De novo' })),
    ).toBe('FORUM_NO_OPEN_REPORTS')
  })
})

describe('restrições', () => {
  it('MUTE lê e não escreve; BAN nem lê; a nova substitui a anterior', async () => {
    const h = setup()
    const message = await h.write.post(BRUNO, 'eng', { content: 'Oi' })
    const mute = await h.restrict.restrict(MOD, {
      userId: 'ana',
      courseSlug: 'eng',
      type: 'MUTE',
      reason: 'Spam repetido',
      days: 7,
    })
    expect(mute).toMatchObject({
      user: { name: 'Ana' },
      createdBy: { name: 'Mod' },
      type: 'MUTE',
    })
    expect(mute.expiresAt).not.toBeNull()
    expect(lastEvent(h)).toMatchObject({
      type: 'UserRestricted',
      restriction: 'MUTE',
      lifted: false,
    })
    expect(
      (await h.read.timeline(ANA, 'eng', { limit: 5 })).items,
    ).toHaveLength(1)
    expect(await code(h.write.post(ANA, 'eng', { content: 'x' }))).toBe(
      'FORUM_MUTED',
    )
    expect(await code(h.write.like(ANA, message.id))).toBe('FORUM_MUTED')
    expect(await h.queue.mine(ANA, 'eng')).toMatchObject({ type: 'MUTE' })

    await h.restrict.restrict(MOD, {
      userId: 'ana',
      courseSlug: 'eng',
      type: 'BAN',
      reason: 'Assédio',
      days: null,
    })
    expect(await code(h.read.timeline(ANA, 'eng', { limit: 5 }))).toBe(
      'FORUM_BANNED',
    )
    expect(await code(h.read.conversation(ANA, message.id))).toBe(
      'FORUM_BANNED',
    )
    const active = await h.queue.restrictions(MOD)
    expect(active.map((item) => item.type)).toEqual(['BAN'])

    await h.restrict.lift(MOD, active[0]!.id, { reason: 'Conversamos' })
    expect(await h.read.timeline(ANA, 'eng', { limit: 5 })).toBeTruthy()
    expect(await h.queue.mine(ANA, 'eng')).toBeNull()
    expect(lastEvent(h)).toMatchObject({ lifted: true, restriction: 'BAN' })
    expect(
      await code(h.restrict.lift(MOD, active[0]!.id, { reason: 'De novo' })),
    ).toBe('RESTRICTION_NOT_FOUND')
  })

  it('o prazo vence sozinho', async () => {
    const h = setup()
    await h.restrict.restrict(MOD, {
      userId: 'ana',
      courseSlug: 'eng',
      type: 'MUTE',
      reason: 'Esfriar a conversa',
      days: 1,
    })
    h.clock.advance(2 * 24 * 60 * 60_000)
    await h.write.post(ANA, 'eng', { content: 'Voltei' })
  })

  it('não restringe moderação nem admin; outro curso não modera', async () => {
    const h = setup()
    const input = {
      courseSlug: 'eng',
      type: 'BAN' as const,
      reason: 'Teste',
      days: null,
    }
    expect(
      await code(h.restrict.restrict(ADMIN, { ...input, userId: 'mod' })),
    ).toBe('FORUM_CANNOT_RESTRICT_STAFF')
    expect(
      await code(h.restrict.restrict(MOD, { ...input, userId: 'admin' })),
    ).toBe('FORUM_CANNOT_RESTRICT_STAFF')
    expect(
      await code(h.restrict.restrict(MOD, { ...input, userId: 'mod' })),
    ).toBe('FORUM_CANNOT_RESTRICT_SELF')
    expect(
      await code(h.restrict.restrict(MOD_OTHER, { ...input, userId: 'ana' })),
    ).toBe('ACCESS_DENIED')
    expect(
      await code(h.restrict.restrict(MOD, { ...input, userId: 'ninguem' })),
    ).toBe('USER_NOT_FOUND')
  })
})

describe('fila e resumo', () => {
  it('moderador vê o curso dele; admin vê tudo e os pedidos', async () => {
    const h = setup()
    h.store.names.set('eva', 'Eva')
    const eng = await h.write.post(ANA, 'eng', { content: 'Na engenharia' })
    const ele = await h.write.post(
      actor('eva', { enrolledCourseIds: new Set([OTHER]) }),
      'ele',
      { content: 'Na elétrica' },
    )
    await h.report.execute(BRUNO, eng.id, { reason: 'SPAM', details: null })
    await h.report.execute(ADMIN, ele.id, { reason: 'SPAM', details: null })
    expect((await h.queue.reports(MOD)).map((item) => item.messageId)).toEqual([
      eng.id,
    ])
    expect(await h.queue.reports(ADMIN)).toHaveLength(2)
    expect(await code(h.queue.reports(MOD, 'ele'))).toBe('ACCESS_DENIED')
    expect(await code(h.queue.reports(ANA))).toBe('ACCESS_DENIED')
    expect(await h.queue.summary(MOD)).toEqual({
      openReports: 1,
      activeRestrictions: 0,
      pendingRequests: null,
    })
    expect(await h.queue.summary(ADMIN)).toMatchObject({
      openReports: 2,
      pendingRequests: 2,
    })
  })
})
