import { describe, expect, it } from 'vitest'

import { notificationSchema } from '../notifications/notifications'
import {
  messageModerationInputSchema,
  reportInputSchema,
  restrictionInputSchema,
} from './moderation'

const ID = '1b8f6a3e-2c1d-4f5e-9a7b-3c2d1e0f9a8b'

describe('moderação do fórum', () => {
  it('denúncia com motivo; detalhes vazios viram nulo', () => {
    expect(reportInputSchema.parse({ reason: 'SPAM', details: '  ' })).toEqual({
      reason: 'SPAM',
      details: null,
    })
    expect(reportInputSchema.safeParse({ reason: 'FEIO' }).success).toBe(false)
  })

  it('remover exige a categoria pública; ocultar não', () => {
    expect(
      messageModerationInputSchema.safeParse({
        action: 'REMOVE',
        reason: 'Telefone da monitora',
      }).success,
    ).toBe(false)
    expect(
      messageModerationInputSchema.parse({
        action: 'REMOVE',
        reason: 'Telefone da monitora',
        category: 'PERSONAL_DATA',
      }),
    ).toMatchObject({ category: 'PERSONAL_DATA' })
    expect(
      messageModerationInputSchema.safeParse({ action: 'HIDE', reason: 'ok' })
        .success,
    ).toBe(false)
  })

  it('restrição com prazo de até um ano, ou sem prazo', () => {
    const base = {
      userId: ID,
      courseSlug: 'engenharia-de-computacao',
      type: 'MUTE',
      reason: 'Spam repetido',
    }
    expect(restrictionInputSchema.safeParse({ ...base, days: 7 }).success).toBe(
      true,
    )
    expect(
      restrictionInputSchema.safeParse({ ...base, days: null }).success,
    ).toBe(true)
    expect(
      restrictionInputSchema.safeParse({ ...base, days: 400 }).success,
    ).toBe(false)
  })

  it('notificações de moderação e de restrição', () => {
    const at = '2026-11-03T12:00:00.000Z'
    const common = { id: ID, readAt: null, createdAt: at, updatedAt: at }
    expect(
      notificationSchema.safeParse({
        ...common,
        type: 'MESSAGE_MODERATED',
        data: {
          messageId: ID,
          courseSlug: 'eng',
          courseName: 'Engenharia',
          action: 'REMOVE',
          category: 'PERSONAL_DATA',
          excerpt: 'O número dela é…',
        },
      }).success,
    ).toBe(true)
    expect(
      notificationSchema.safeParse({
        ...common,
        type: 'USER_RESTRICTED',
        data: {
          courseSlug: 'eng',
          courseName: 'Engenharia',
          restriction: 'MUTE',
          lifted: false,
          expiresAt: at,
        },
      }).success,
    ).toBe(true)
  })
})
