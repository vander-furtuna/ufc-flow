import { describe, expect, it } from 'vitest'

import { DomainError } from '../../../shared/domain/domain-error'
import {
  assertRate,
  deletionOf,
  editMessage,
  editableUntil,
  mentionCodes,
  newMessage,
  visibilityOf,
  type Message,
} from './message'

const NOW = new Date('2026-11-03T12:00:00.000Z')
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000)

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 'm1',
  courseId: 'c1',
  authorId: 'ana',
  parentId: null,
  rootId: null,
  content: 'Alguém tem lista de @SBL0057?',
  replyCount: 0,
  likeCount: 0,
  status: 'VISIBLE',
  createdAt: NOW,
  editedAt: null,
  removedAt: null,
  removedBy: null,
  removalReason: null,
  ...overrides,
})

const code = (work: () => unknown) => {
  try {
    work()
  } catch (error) {
    return (error as DomainError).code
  }
  return null
}

describe('nova mensagem', () => {
  it('raiz sem pai; resposta guarda o pai e a raiz da conversa', () => {
    const root = newMessage({
      id: 'm1',
      courseId: 'c1',
      authorId: 'ana',
      content: 'Oi',
      parent: null,
      now: NOW,
    })
    expect(root).toMatchObject({ parentId: null, rootId: null })
    const reply = newMessage({
      id: 'm2',
      courseId: 'c1',
      authorId: 'bruno',
      content: 'Oi',
      parent: root,
      now: NOW,
    })
    expect(reply).toMatchObject({ parentId: 'm1', rootId: 'm1' })
    const deeper = newMessage({
      id: 'm3',
      courseId: 'c1',
      authorId: 'ana',
      content: 'Oi',
      parent: reply,
      now: NOW,
    })
    expect(deeper).toMatchObject({ parentId: 'm2', rootId: 'm1' })
  })

  it.each(['HIDDEN', 'REMOVED'] as const)(
    'não responde mensagem %s',
    (status) => {
      expect(
        code(() =>
          newMessage({
            id: 'm2',
            courseId: 'c1',
            authorId: 'bruno',
            content: 'Oi',
            parent: message({ status }),
            now: NOW,
          }),
        ),
      ).toBe('FORUM_MESSAGE_UNAVAILABLE')
    },
  )

  it('até 5 menções distintas', () => {
    expect(mentionCodes('@ECO0001 @ECO0001 e @SBL0057')).toEqual([
      'ECO0001',
      'SBL0057',
    ])
    expect(
      code(() =>
        mentionCodes('@ECO0001 @ECO0002 @ECO0003 @ECO0004 @ECO0005 @ECO0006'),
      ),
    ).toBe('FORUM_TOO_MANY_MENTIONS')
  })
})

describe('edição', () => {
  it('o autor edita em até 15 minutos', () => {
    const edited = editMessage(message(), 'ana', 'Novo texto', minutes(15))
    expect(edited).toMatchObject({
      content: 'Novo texto',
      editedAt: minutes(15),
    })
    expect(code(() => editMessage(message(), 'ana', 'x', minutes(16)))).toBe(
      'FORUM_EDIT_WINDOW_CLOSED',
    )
    expect(code(() => editMessage(message(), 'bruno', 'x', NOW))).toBe(
      'FORUM_NOT_AUTHOR',
    )
    expect(
      code(() => editMessage(message({ status: 'REMOVED' }), 'ana', 'x', NOW)),
    ).toBe('FORUM_MESSAGE_UNAVAILABLE')
  })

  it('prazo de edição só para o autor e enquanto vale', () => {
    expect(editableUntil(message(), 'ana', minutes(5))).toEqual(minutes(15))
    expect(editableUntil(message(), 'bruno', minutes(5))).toBeNull()
    expect(editableUntil(message(), 'ana', minutes(20))).toBeNull()
    expect(editableUntil(message({ status: 'HIDDEN' }), 'ana', NOW)).toBeNull()
  })
})

describe('apagar a própria mensagem', () => {
  it('sem respostas some; com respostas vira "mensagem apagada"', () => {
    expect(deletionOf(message(), 'ana', NOW)).toEqual({ kind: 'DELETE' })
    expect(deletionOf(message({ replyCount: 2 }), 'ana', NOW)).toEqual({
      kind: 'REMOVE',
      message: message({
        replyCount: 2,
        content: '',
        status: 'REMOVED',
        removedAt: NOW,
        removedBy: 'ana',
      }),
    })
    expect(code(() => deletionOf(message(), 'bruno', NOW))).toBe(
      'FORUM_NOT_AUTHOR',
    )
    expect(
      code(() => deletionOf(message({ status: 'REMOVED' }), 'ana', NOW)),
    ).toBe('FORUM_MESSAGE_UNAVAILABLE')
  })
})

describe('limite de envio', () => {
  const limits = { burst: 1, burstSeconds: 10, hourly: 30 }
  it.each([
    [0, 0, null],
    [1, 1, 'FORUM_RATE_LIMITED'],
    [0, 29, null],
    [0, 30, 'FORUM_RATE_LIMITED'],
  ])('%i nos últimos 10 s e %i na hora', (burst, hour, expected) => {
    expect(
      code(() => assertRate({ inBurst: burst, inHour: hour }, limits)),
    ).toBe(expected)
  })
})

describe('quem vê o quê', () => {
  const reader = { userId: 'bruno', canModerate: false }
  const moderator = { userId: 'mod', canModerate: true }
  it.each([
    ['VISIBLE', reader, 'FULL'],
    ['HIDDEN', reader, 'NONE'],
    ['HIDDEN', { userId: 'ana', canModerate: false }, 'FULL'],
    ['HIDDEN', moderator, 'FULL'],
    ['REMOVED', reader, 'PLACEHOLDER'],
    ['REMOVED', moderator, 'PLACEHOLDER'],
  ] as const)('%s para %o', (status, viewer, expected) => {
    expect(visibilityOf(message({ status }), viewer)).toBe(expected)
  })

  it('oculta com respostas vira aviso dentro da conversa', () => {
    expect(
      visibilityOf(message({ status: 'HIDDEN', replyCount: 1 }), reader),
    ).toBe('PLACEHOLDER')
  })
})
