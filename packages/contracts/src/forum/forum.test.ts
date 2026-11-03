import { describe, expect, it } from 'vitest'

import { notificationSchema } from '../notifications/notifications'
import {
  FORUM_LIMITS,
  messageInputSchema,
  messageSchema,
  newMessagesQuerySchema,
  subjectSearchQuerySchema,
} from './forum'

const ID = '1b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b'

describe('fórum', () => {
  it('mensagem com até 500 caracteres, sem espaços nas pontas', () => {
    expect(messageInputSchema.parse({ content: '  Oi @ECO0005  ' })).toEqual({
      content: 'Oi @ECO0005',
    })
    expect(messageInputSchema.safeParse({ content: '   ' }).success).toBe(false)
    expect(
      messageInputSchema.safeParse({
        content: 'a'.repeat(FORUM_LIMITS.content + 1),
      }).success,
    ).toBe(false)
  })

  it('mensagem apagada vem sem conteúdo e com quem tirou do ar', () => {
    const message = {
      id: ID,
      courseId: ID,
      parentId: null,
      rootId: null,
      author: null,
      replyingTo: null,
      content: null,
      status: 'REMOVED',
      removedBy: 'AUTHOR',
      removalCategory: null,
      replyCount: 2,
      likeCount: 0,
      likedByMe: false,
      mentions: [],
      createdAt: '2026-11-03T12:00:00.000Z',
      editedAt: null,
      editableUntil: null,
    }
    expect(messageSchema.safeParse(message).success).toBe(true)
    expect(
      messageSchema.safeParse({ ...message, removedBy: 'OUTRO' }).success,
    ).toBe(false)
  })

  it('busca de disciplinas e contagem de novas', () => {
    expect(subjectSearchQuerySchema.parse({ q: ' cálc ' })).toEqual({
      q: 'cálc',
      limit: 8,
    })
    expect(subjectSearchQuerySchema.safeParse({ q: '' }).success).toBe(false)
    expect(newMessagesQuerySchema.safeParse({ since: 'ontem' }).success).toBe(
      false,
    )
  })

  it('notificação de curtidas com até 3 nomes', () => {
    const likes = {
      id: ID,
      type: 'FORUM_LIKES',
      readAt: null,
      createdAt: '2026-11-03T12:00:00.000Z',
      updatedAt: '2026-11-03T12:00:00.000Z',
      data: {
        messageId: ID,
        courseSlug: 'engenharia-de-computacao',
        excerpt: 'Bora montar grupo de estudos',
        likerNames: ['Ana', 'Bruno'],
        likes: 5,
      },
    }
    expect(notificationSchema.safeParse(likes).success).toBe(true)
    expect(
      notificationSchema.safeParse({
        ...likes,
        data: { ...likes.data, likerNames: ['a', 'b', 'c', 'd'] },
      }).success,
    ).toBe(false)
  })
})
