'use server'

import {
  dismissReportsInputSchema,
  liftRestrictionInputSchema,
  messageModerationInputSchema,
  restrictionInputSchema,
  reviewModeratorRequestInputSchema,
  type CursorPage,
  type MessageModerationInput,
  type MessageView,
  type ModerationSummary,
  type ModeratorRequest,
  type ProblemDetails,
  type ReportQueueItem,
  type RestrictionInput,
  type RestrictionView,
} from '@ufc-flow/contracts'

import { userFetch } from '@/lib/auth/user-api'

export type ModerationResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ModerationResult<T>> {
  const result = await userFetch<T>(path, init)
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const invalid = (detail: string): ModerationResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail, status: 400 },
})

const message = (id: string) => `/v1/forum/messages/${encodeURIComponent(id)}`

export async function summaryAction() {
  return call<ModerationSummary>('/v1/moderation/summary')
}

export async function reportQueueAction() {
  return call<ReportQueueItem[]>('/v1/moderation/reports')
}

export async function restrictionsAction() {
  return call<RestrictionView[]>('/v1/moderation/restrictions')
}

export async function pendingRequestsAction() {
  return call<CursorPage<ModeratorRequest>>(
    '/v1/moderator-requests?status=PENDING&limit=100',
  )
}

export async function moderateMessageAction(
  id: string,
  input: MessageModerationInput,
) {
  const parsed = messageModerationInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]!.message)
  return call<MessageView>(`${message(id)}/moderation`, {
    method: 'POST',
    body: parsed.data,
  })
}

export async function dismissReportsAction(id: string, reason: string) {
  const parsed = dismissReportsInputSchema.safeParse({ reason })
  if (!parsed.success) return invalid(parsed.error.issues[0]!.message)
  return call<void>(`${message(id)}/reports/dismiss`, {
    method: 'POST',
    body: parsed.data,
  })
}

export async function restrictUserAction(input: RestrictionInput) {
  const parsed = restrictionInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]!.message)
  return call<RestrictionView>('/v1/moderation/restrictions', {
    method: 'POST',
    body: parsed.data,
  })
}

export async function liftRestrictionAction(id: string, reason: string) {
  const parsed = liftRestrictionInputSchema.safeParse({ reason })
  if (!parsed.success) return invalid(parsed.error.issues[0]!.message)
  return call<void>(
    `/v1/moderation/restrictions/${encodeURIComponent(id)}/lift`,
    { method: 'POST', body: parsed.data },
  )
}

export async function reviewRequestAction(
  id: string,
  decision: 'approve' | 'reject',
  note: string,
) {
  const parsed = reviewModeratorRequestInputSchema.safeParse({
    note: note.trim() || undefined,
  })
  if (!parsed.success) return invalid('Nota inválida')
  return call<ModeratorRequest>(
    `/v1/moderator-requests/${encodeURIComponent(id)}/${decision}`,
    { method: 'POST', body: parsed.data },
  )
}
