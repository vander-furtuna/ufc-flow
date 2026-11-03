import { describe, expect, it } from 'vitest'

import type { Actor } from '../../../shared/domain/access-policy'
import { DomainError } from '../../../shared/domain/domain-error'
import { RecordingEventPublisher } from '../../../shared/domain/events'
import {
  SequentialIds,
  SteppingClock,
} from '../../catalog/application/testing/in-memory-catalog'
import type { RateLimits } from '../domain/message'
import {
  ReadForumUseCase,
  SearchSubjectsUseCase,
  WriteForumUseCase,
} from './forum.use-cases'
import { InMemoryForum } from './testing/in-memory-forum'

const COURSE = 'c-eng'
const actor = (
  userId: string | null,
  overrides: Partial<Actor> = {},
): Actor => ({
  userId,
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(userId ? [COURSE] : []),
  ...overrides,
})
const ANA = actor('ana')
const BRUNO = actor('bruno')
const CARLA = actor('carla')
const VISITOR = actor('visitante', { enrolledCourseIds: new Set() })
const MOD = actor('mod', {
  enrolledCourseIds: new Set(),
  moderatedCourseIds: new Set([COURSE]),
})
const ANON = actor(null)

const LOOSE: RateLimits = { burst: 100, burstSeconds: 10, hourly: 1000 }

function setup(limits: RateLimits = LOOSE) {
  const store = new InMemoryForum()
  store.courses = [
    { id: COURSE, slug: 'eng', name: 'Engenharia', isActive: true },
    { id: 'c-off', slug: 'off', name: 'Fechado', isActive: false },
  ]
  store.subjects = [
    {
      id: 's-calc1',
      code: 'SBL0057',
      name: 'Cálculo Diferencial e Integral I',
      slug: 'calculo-1',
      semesterIn: { [COURSE]: 1 },
    },
    {
      id: 's-econ',
      code: 'ECN0012',
      name: 'Cálculo Aplicado à Economia',
      slug: 'calculo-economia',
    },
    { id: 's-so', code: 'ECO0036', name: 'Sistemas Operacionais', slug: 'so' },
  ]
  for (const name of ['ana', 'bruno', 'carla', 'mod']) {
    store.names.set(name, name[0]!.toUpperCase() + name.slice(1))
  }
  const clock = new SteppingClock('2026-11-03T12:00:00.000Z')
  const events = new RecordingEventPublisher()
  return {
    store,
    clock,
    events,
    read: new ReadForumUseCase(store, clock),
    write: new WriteForumUseCase(
      store,
      clock,
      new SequentialIds(),
      events,
      limits,
    ),
    search: new SearchSubjectsUseCase(store),
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

describe('escrever no fórum', () => {
  it('quem tem matrícula, a moderação e admins escrevem; menções resolvidas', async () => {
    const { write } = setup()
    const message = await write.post(ANA, 'eng', {
      content: 'Lista de @SBL0057 e @XYZ9999?',
    })
    expect(message).toMatchObject({
      author: { id: 'ana', name: 'Ana' },
      content: 'Lista de @SBL0057 e @XYZ9999?',
      mentions: [{ code: 'SBL0057', slug: 'calculo-1' }],
      parentId: null,
    })
    expect(message.editableUntil).not.toBeNull()
    await write.post(MOD, 'eng', { content: 'Aviso da moderação' })
    expect(await code(write.post(VISITOR, 'eng', { content: 'Oi' }))).toBe(
      'FORUM_POST_FORBIDDEN',
    )
    expect(await code(write.post(ANA, 'off', { content: 'Oi' }))).toBe(
      'COURSE_NOT_FOUND',
    )
  })

  it('resposta conta na mensagem e avisa autor e conversa', async () => {
    const { write, read, events } = setup()
    const root = await write.post(ANA, 'eng', { content: 'Prova de SO?' })
    const reply = await write.reply(BRUNO, root.id, { content: 'Cobrou RR' })
    const deeper = await write.reply(CARLA, reply.id, { content: 'Valeu' })
    expect(deeper).toMatchObject({
      parentId: reply.id,
      rootId: root.id,
      replyingTo: { authorName: 'Bruno' },
    })
    const conversation = await read.conversation(BRUNO, deeper.id)
    expect(conversation.ancestors.map((item) => item.id)).toEqual([
      root.id,
      reply.id,
    ])
    expect(conversation.ancestors[0]!.replyCount).toBe(1)
    expect(events.events.at(-1)).toMatchObject({
      type: 'MessageReplied',
      parentAuthorId: 'bruno',
      threadAuthorIds: expect.arrayContaining(['ana', 'bruno', 'carla']),
    })
  })

  it('limite de envio por pessoa', async () => {
    const { write } = setup({ burst: 1, burstSeconds: 10, hourly: 30 })
    await write.post(ANA, 'eng', { content: 'Primeira' })
    expect(await code(write.post(ANA, 'eng', { content: 'Segunda' }))).toBe(
      'FORUM_RATE_LIMITED',
    )
    await write.post(BRUNO, 'eng', { content: 'Outra pessoa' })
  })

  it('edita em 15 min, troca as menções; outra pessoa não', async () => {
    const { write, clock } = setup()
    const message = await write.post(ANA, 'eng', { content: '@SBL0057' })
    const edited = await write.edit(ANA, message.id, {
      content: 'Agora @ECO0036',
    })
    expect(edited.mentions.map((item) => item.code)).toEqual(['ECO0036'])
    expect(edited.editedAt).not.toBeNull()
    expect(await code(write.edit(BRUNO, message.id, { content: 'x' }))).toBe(
      'FORUM_NOT_AUTHOR',
    )
    clock.advance(16 * 60_000)
    expect(await code(write.edit(ANA, message.id, { content: 'x' }))).toBe(
      'FORUM_EDIT_WINDOW_CLOSED',
    )
  })

  it('apagar: some sem respostas; vira "mensagem apagada" com respostas', async () => {
    const { write, read } = setup()
    const alone = await write.post(ANA, 'eng', { content: 'Sozinha' })
    const root = await write.post(ANA, 'eng', { content: 'Com resposta' })
    const reply = await write.reply(BRUNO, root.id, { content: 'Resposta' })
    await write.remove(ANA, alone.id)
    await write.remove(ANA, root.id)
    const timeline = await read.timeline(BRUNO, 'eng', { limit: 20 })
    expect(timeline.items).toHaveLength(1)
    expect(timeline.items[0]).toMatchObject({
      id: root.id,
      content: null,
      status: 'REMOVED',
      removedBy: 'AUTHOR',
      replyCount: 1,
    })
    // Resposta apagada sem respostas some e desconta da mensagem
    await write.remove(BRUNO, reply.id)
    const conversation = await read.conversation(ANA, root.id)
    expect(conversation.message.replyCount).toBe(0)
    expect(conversation.replies.items).toEqual([])
  })

  it('curtir e descurtir uma vez por pessoa, com o evento só na primeira', async () => {
    const { write, events } = setup()
    const message = await write.post(ANA, 'eng', { content: 'Oi' })
    expect(await write.like(BRUNO, message.id)).toEqual({
      likeCount: 1,
      likedByMe: true,
    })
    expect(await write.like(BRUNO, message.id)).toEqual({
      likeCount: 1,
      likedByMe: true,
    })
    expect(
      events.events.filter((event) => event.type === 'MessageLiked'),
    ).toHaveLength(1)
    expect(await write.unlike(BRUNO, message.id)).toEqual({
      likeCount: 0,
      likedByMe: false,
    })
    expect(await code(write.like(VISITOR, message.id))).toBe(
      'FORUM_POST_FORBIDDEN',
    )
  })
})

describe('ler o fórum', () => {
  it('timeline só com raízes, das mais novas, paginada; anônimo não lê', async () => {
    const { write, read } = setup()
    const first = await write.post(ANA, 'eng', { content: '1' })
    await write.reply(BRUNO, first.id, { content: 'r' })
    await write.post(ANA, 'eng', { content: '2' })
    await write.post(ANA, 'eng', { content: '3' })
    const page = await read.timeline(VISITOR, 'eng', { limit: 2 })
    expect(page.items.map((item) => item.content)).toEqual(['3', '2'])
    const next = await read.timeline(VISITOR, 'eng', {
      limit: 2,
      cursor: page.nextCursor!,
    })
    expect(next.items.map((item) => item.content)).toEqual(['1'])
    expect(next.nextCursor).toBeNull()
    expect(await code(read.timeline(ANON, 'eng', { limit: 2 }))).toBe(
      'FORUM_LOGIN_REQUIRED',
    )
  })

  it('novas mensagens desde a mais nova carregada, sem contar as minhas', async () => {
    const { write, read } = setup()
    const top = await write.post(ANA, 'eng', { content: 'Topo' })
    await write.post(BRUNO, 'eng', { content: 'Nova' })
    await write.post(ANA, 'eng', { content: 'Minha' })
    expect(await read.newCount(ANA, 'eng', new Date(top.createdAt))).toEqual({
      count: 1,
    })
  })

  it('oculta: some para os outros, o autor e a moderação veem', async () => {
    const { write, read, store } = setup()
    const message = await write.post(ANA, 'eng', { content: 'Polêmica' })
    store.messages.get(message.id)!.status = 'HIDDEN'
    expect((await read.timeline(BRUNO, 'eng', { limit: 5 })).items).toEqual([])
    expect(await code(read.conversation(BRUNO, message.id))).toBe(
      'FORUM_MESSAGE_NOT_FOUND',
    )
    expect(
      (await read.timeline(ANA, 'eng', { limit: 5 })).items[0]?.content,
    ).toBe('Polêmica')
    expect(
      (await read.timeline(MOD, 'eng', { limit: 5 })).items[0]?.status,
    ).toBe('HIDDEN')
  })

  it('discussões da disciplina e mais citadas na semana', async () => {
    const { write, read, clock } = setup()
    await write.post(ANA, 'eng', { content: 'Antiga @ECO0036' })
    clock.advance(8 * 24 * 60 * 60_000)
    await write.post(ANA, 'eng', { content: '@SBL0057 e @ECO0036' })
    await write.post(BRUNO, 'eng', { content: 'Mais @SBL0057' })
    const discussions = await read.bySubject(BRUNO, 'eng', 'SBL0057', {
      limit: 10,
    })
    expect(discussions.items.map((item) => item.content)).toEqual([
      'Mais @SBL0057',
      '@SBL0057 e @ECO0036',
    ])
    expect(await read.trending(BRUNO, 'eng')).toEqual([
      {
        code: 'SBL0057',
        name: 'Cálculo Diferencial e Integral I',
        slug: 'calculo-1',
        count: 2,
      },
      { code: 'ECO0036', name: 'Sistemas Operacionais', slug: 'so', count: 1 },
    ])
    expect(
      await code(read.bySubject(BRUNO, 'eng', 'XYZ9999', { limit: 5 })),
    ).toBe('SUBJECT_NOT_FOUND')
  })
})

describe('busca de disciplinas para o @', () => {
  it('sem acento, ignorando o @, com a EC vigente primeiro', async () => {
    const { search } = setup()
    const results = await search.execute('eng', { q: '@CÁLC', limit: 8 })
    expect(results.map((item) => [item.code, item.inCurriculum])).toEqual([
      ['SBL0057', true],
      ['ECN0012', false],
    ])
    expect(await search.execute('eng', { q: '@', limit: 8 })).toEqual([])
  })
})
