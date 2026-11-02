import { describe, expect, it } from 'vitest'

import { ANONYMOUS, type Actor } from '../../../shared/domain/access-policy'
import { DomainError } from '../../../shared/domain/domain-error'
import { RecordingEventPublisher } from '../../../shared/domain/events'
import { CancelModeratorRequestUseCase } from './cancel-moderator-request.use-case'
import { ListModeratorRequestsUseCase } from './list-moderator-requests.use-case'
import { ListMyModeratorRequestsUseCase } from './list-my-moderator-requests.use-case'
import { RequestModerationUseCase } from './request-moderation.use-case'
import { ReviewModeratorRequestUseCase } from './review-moderator-request.use-case'
import { identityTestbed } from './testing/in-memory-identity'

const MINUTE = 60_000
const justification = 'Sou do centro acadêmico e mantenho a grade atualizada.'

const actor = (userId: string, extra: Partial<Actor> = {}): Actor => ({
  userId,
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(),
  ...extra,
})

function setup() {
  const t = identityTestbed()
  const events = new RecordingEventPublisher()
  for (const [id, name] of [
    ['u1', 'Ana Souza'],
    ['u2', 'Bruno Lima'],
    ['admin', 'Admin'],
  ] as const) {
    t.store.users.set(id, {
      id,
      name,
      email: `${id}@ufc.br`,
      passwordHash: 'x',
      status: 'ACTIVE',
      createdAt: t.clock.now(),
      updatedAt: t.clock.now(),
    })
  }
  t.store.courses.set('c1', { id: 'c1', slug: 'eng', name: 'Engenharia' })
  t.store.courses.set('c2', { id: 'c2', slug: 'psi', name: 'Psicologia' })
  return {
    ...t,
    events,
    admin: actor('admin', { isAdmin: true }),
    request: new RequestModerationUseCase(t.store, t.clock, t.ids, events),
    list: new ListModeratorRequestsUseCase(t.store),
    listMine: new ListMyModeratorRequestsUseCase(t.store),
    review: new ReviewModeratorRequestUseCase(t.store, t.clock, t.ids, events),
    cancel: new CancelModeratorRequestUseCase(t.store),
  }
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  return 'sem erro'
}

describe('pedir moderação', () => {
  it('cria um pedido pendente com usuário e curso', async () => {
    const s = setup()
    const created = await s.request.execute(actor('u1'), {
      courseId: 'c1',
      justification,
    })
    expect(created).toMatchObject({
      user: { id: 'u1', name: 'Ana Souza', email: 'u1@ufc.br' },
      course: { id: 'c1', slug: 'eng', name: 'Engenharia' },
      status: 'PENDING',
      reviewNote: null,
      createdAt: '2026-11-01T12:00:00.000Z',
    })
  })

  it('exige login, curso existente e um pedido pendente por vez', async () => {
    const s = setup()
    expect(
      await codeOf(
        s.request.execute(ANONYMOUS, { courseId: 'c1', justification }),
      ),
    ).toBe('ACCESS_DENIED')
    expect(
      await codeOf(
        s.request.execute(actor('u1'), { courseId: 'x', justification }),
      ),
    ).toBe('COURSE_NOT_FOUND')
    await s.request.execute(actor('u1'), { courseId: 'c1', justification })
    expect(
      await codeOf(
        s.request.execute(actor('u1'), { courseId: 'c1', justification }),
      ),
    ).toBe('MODERATOR_REQUEST_PENDING_EXISTS')
    expect(
      await codeOf(
        s.request.execute(actor('u1'), { courseId: 'c2', justification }),
      ),
    ).toBe('sem erro')
  })

  it('admin não pede; moderador não pede o curso que já modera', async () => {
    const s = setup()
    expect(
      await codeOf(
        s.request.execute(s.admin, { courseId: 'c1', justification }),
      ),
    ).toBe('ACCESS_DENIED')
    const moderator = actor('u2', { moderatedCourseIds: new Set(['c1']) })
    expect(
      await codeOf(
        s.request.execute(moderator, { courseId: 'c1', justification }),
      ),
    ).toBe('MODERATOR_ALREADY_ACTIVE')
  })
})

describe('responder pedidos', () => {
  it('aprovar cria o moderador e registra na auditoria', async () => {
    const s = setup()
    const { id } = await s.request.execute(actor('u1'), {
      courseId: 'c1',
      justification,
    })
    s.clock.advance(MINUTE)
    const approved = await s.review.execute(
      s.admin,
      id,
      'APPROVED',
      'Bem-vinda',
    )
    expect(approved).toMatchObject({
      status: 'APPROVED',
      reviewNote: 'Bem-vinda',
      reviewedAt: '2026-11-01T12:01:00.000Z',
    })
    expect(s.store.moderators).toEqual([
      expect.objectContaining({
        userId: 'u1',
        courseId: 'c1',
        requestId: id,
        grantedBy: 'admin',
      }),
    ])
    expect(s.store.auditEntries).toEqual([
      expect.objectContaining({
        actorId: 'admin',
        entity: 'moderator_request',
        entityId: id,
        action: 'moderator_request.approved',
      }),
    ])
    // Depois do commit: os admins e o solicitante são avisados
    expect(s.events.events).toEqual([
      expect.objectContaining({
        type: 'ModeratorRequestCreated',
        requestId: id,
        userId: 'u1',
        courseId: 'c1',
      }),
      expect.objectContaining({
        type: 'ModeratorRequestReviewed',
        requestId: id,
        userId: 'u1',
        reviewerId: 'admin',
        decision: 'APPROVED',
        note: 'Bem-vinda',
        occurredAt: new Date('2026-11-01T12:01:00.000Z'),
      }),
    ])
  })

  it('rejeitar não cria moderador', async () => {
    const s = setup()
    const { id } = await s.request.execute(actor('u1'), {
      courseId: 'c1',
      justification,
    })
    const rejected = await s.review.execute(s.admin, id, 'REJECTED', null)
    expect(rejected.status).toBe('REJECTED')
    expect(s.store.moderators).toEqual([])
    expect(s.store.auditEntries[0]?.action).toBe('moderator_request.rejected')
  })

  it('só admin responde, e um pedido só uma vez', async () => {
    const s = setup()
    const { id } = await s.request.execute(actor('u1'), {
      courseId: 'c1',
      justification,
    })
    expect(
      await codeOf(s.review.execute(actor('u2'), id, 'APPROVED', null)),
    ).toBe('ACCESS_DENIED')
    expect(await codeOf(s.review.execute(s.admin, 'x', 'APPROVED', null))).toBe(
      'MODERATOR_REQUEST_NOT_FOUND',
    )
    await s.review.execute(s.admin, id, 'APPROVED', null)
    expect(await codeOf(s.review.execute(s.admin, id, 'REJECTED', null))).toBe(
      'MODERATOR_REQUEST_NOT_PENDING',
    )
  })

  it('o dono cancela o próprio pedido pendente', async () => {
    const s = setup()
    const { id } = await s.request.execute(actor('u1'), {
      courseId: 'c1',
      justification,
    })
    expect(await codeOf(s.cancel.execute(actor('u2'), id))).toBe(
      'ACCESS_DENIED',
    )
    expect((await s.cancel.execute(actor('u1'), id)).status).toBe('CANCELED')
    expect(await codeOf(s.cancel.execute(actor('u1'), 'x'))).toBe(
      'MODERATOR_REQUEST_NOT_FOUND',
    )
  })
})

describe('listar pedidos', () => {
  it('admin lista do mais novo ao mais antigo, com filtro e cursor', async () => {
    const s = setup()
    const ids: string[] = []
    for (const [user, course] of [
      ['u1', 'c1'],
      ['u2', 'c1'],
      ['u1', 'c2'],
    ] as const) {
      ids.push(
        (
          await s.request.execute(actor(user), {
            courseId: course,
            justification,
          })
        ).id,
      )
      s.clock.advance(MINUTE)
    }
    await s.review.execute(s.admin, ids[0]!, 'REJECTED', null)

    const first = await s.list.execute(s.admin, { status: 'PENDING', limit: 1 })
    expect(first.items.map((item) => item.id)).toEqual([ids[2]])
    expect(first.nextCursor).not.toBeNull()
    const second = await s.list.execute(s.admin, {
      status: 'PENDING',
      limit: 1,
      cursor: first.nextCursor!,
    })
    expect(second.items.map((item) => item.id)).toEqual([ids[1]])
    expect(second.nextCursor).toBeNull()

    const all = await s.list.execute(s.admin, { limit: 20 })
    expect(all.items).toHaveLength(3)
  })

  it('só admin lista todos; cursor inválido é erro', async () => {
    const s = setup()
    expect(await codeOf(s.list.execute(actor('u1'), { limit: 20 }))).toBe(
      'ACCESS_DENIED',
    )
    expect(
      await codeOf(s.list.execute(s.admin, { limit: 20, cursor: '@@' })),
    ).toBe('INVALID_CURSOR')
  })

  it('o usuário vê os próprios pedidos', async () => {
    const s = setup()
    await s.request.execute(actor('u1'), { courseId: 'c1', justification })
    await s.request.execute(actor('u2'), { courseId: 'c1', justification })
    const mine = await s.listMine.execute(actor('u1'))
    expect(mine.map((item) => item.user.id)).toEqual(['u1'])
    expect(await codeOf(s.listMine.execute(ANONYMOUS))).toBe('ACCESS_DENIED')
  })
})
