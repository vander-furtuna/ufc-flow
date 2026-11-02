import { describe, expect, it } from 'vitest'

import {
  markNotificationsReadInputSchema,
  notificationListQuerySchema,
  notificationPreferencesSchema,
  notificationSchema,
} from './notifications'

const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'
const AT = '2026-11-02T12:00:00.000Z'

describe('notificações', () => {
  it('os dados seguem o tipo', () => {
    const failed = {
      id: ID,
      type: 'SCRAPE_FAILED',
      readAt: null,
      createdAt: AT,
      updatedAt: AT,
      data: {
        courseName: 'Engenharia de Computação',
        courseSlug: 'engenharia-de-computacao',
        term: '2026.2',
        error: 'SIGAA respondeu 503',
        failures: 2,
      },
    }
    expect(notificationSchema.safeParse(failed).success).toBe(true)
    expect(
      notificationSchema.safeParse({ ...failed, type: 'IMPORT_PENDING' })
        .success,
    ).toBe(false)
    expect(
      notificationSchema.safeParse({ ...failed, type: 'FORUM_REPLY' }).success,
    ).toBe(false)
  })

  it('importação pendente guarda o id numérico do SIGAA', () => {
    const pending = (sigaaId: string) => ({
      id: ID,
      type: 'IMPORT_PENDING',
      readAt: null,
      createdAt: AT,
      updatedAt: AT,
      data: { importId: ID, sigaaId, courseName: 'MEDICINA', imports: 1 },
    })
    expect(notificationSchema.safeParse(pending('657494')).success).toBe(true)
    expect(notificationSchema.safeParse(pending('d')).success).toBe(false)
  })

  it('filtro de não lidas e paginação na query', () => {
    expect(notificationListQuerySchema.parse({ unread: 'true' })).toEqual({
      unread: true,
      limit: 20,
    })
    expect(notificationListQuerySchema.parse({})).toEqual({ limit: 20 })
  })

  it('marca algumas ou todas como lidas', () => {
    expect(
      markNotificationsReadInputSchema.safeParse({ ids: [ID] }).success,
    ).toBe(true)
    expect(
      markNotificationsReadInputSchema.safeParse({ all: true }).success,
    ).toBe(true)
    expect(
      markNotificationsReadInputSchema.safeParse({ ids: [] }).success,
    ).toBe(false)
    expect(
      markNotificationsReadInputSchema.safeParse({ all: false }).success,
    ).toBe(false)
  })

  it('preferências só aceitam tipos conhecidos', () => {
    expect(
      notificationPreferencesSchema.safeParse({ muted: ['SCRAPE_FAILED'] })
        .success,
    ).toBe(true)
    expect(
      notificationPreferencesSchema.safeParse({ muted: ['OUTRO'] }).success,
    ).toBe(false)
  })
})
