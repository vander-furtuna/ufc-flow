'use server'

import {
  markNotificationsReadInputSchema,
  notificationPreferencesSchema,
  type MarkNotificationsReadInput,
  type NotificationPage,
  type NotificationPreferences,
  type ProblemDetails,
  type UnreadCount,
} from '@ufc-flow/contracts'

import { userFetch } from '@/lib/auth/user-api'

export type NotificationResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<NotificationResult<T>> {
  const result = await userFetch<T>(path, init)
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const invalid = (detail: string): NotificationResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail, status: 400 },
})

export async function listNotificationsAction(query: {
  cursor?: string
  unread?: boolean
  limit?: number
}) {
  const params = new URLSearchParams({ limit: String(query.limit ?? 20) })
  if (query.cursor) params.set('cursor', query.cursor)
  if (query.unread) params.set('unread', 'true')
  return call<NotificationPage>(`/v1/me/notifications?${params.toString()}`)
}

export async function unreadCountAction() {
  return call<UnreadCount>('/v1/me/notifications/unread-count')
}

export async function markNotificationsReadAction(
  input: MarkNotificationsReadInput,
) {
  const parsed = markNotificationsReadInputSchema.safeParse(input)
  if (!parsed.success) return invalid('Notificações inválidas')
  return call<void>('/v1/me/notifications/read', {
    method: 'POST',
    body: parsed.data,
  })
}

export async function getNotificationPreferencesAction() {
  return call<NotificationPreferences>('/v1/me/notification-preferences')
}

export async function saveNotificationPreferencesAction(
  input: NotificationPreferences,
) {
  const parsed = notificationPreferencesSchema.safeParse(input)
  if (!parsed.success) return invalid('Preferências inválidas')
  return call<NotificationPreferences>('/v1/me/notification-preferences', {
    method: 'PUT',
    body: parsed.data,
  })
}
