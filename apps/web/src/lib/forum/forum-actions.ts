'use server'

import {
  messageInputSchema,
  reportInputSchema,
  type ConversationView,
  type LikeState,
  type MessageInput,
  type MessagePage,
  type MessageView,
  type MyRestriction,
  type NewMessagesCount,
  type ProblemDetails,
  type ReportInput,
  type SubjectSearchResult,
  type TrendingSubject,
} from '@ufc-flow/contracts'

import { callApi } from '@/lib/auth/api'
import { userFetch } from '@/lib/auth/user-api'

export type ForumResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ForumResult<T>> {
  const result = await userFetch<T>(path, init)
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const invalid = (detail: string): ForumResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail, status: 400 },
})

const course = (slug: string) => `/v1/courses/${encodeURIComponent(slug)}`
const message = (id: string) => `/v1/forum/messages/${encodeURIComponent(id)}`
const page = (cursor?: string) =>
  cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=20` : '?limit=20'

export async function timelineAction(courseSlug: string, cursor?: string) {
  return call<MessagePage>(
    `${course(courseSlug)}/forum/messages${page(cursor)}`,
  )
}

export async function newCountAction(courseSlug: string, since: string) {
  return call<NewMessagesCount>(
    `${course(courseSlug)}/forum/messages/new-count?since=${encodeURIComponent(since)}`,
  )
}

export async function trendingAction(courseSlug: string) {
  return call<TrendingSubject[]>(
    `${course(courseSlug)}/forum/trending-subjects`,
  )
}

export async function subjectMessagesAction(
  courseSlug: string,
  code: string,
  cursor?: string,
) {
  return call<MessagePage>(
    `${course(courseSlug)}/forum/subjects/${encodeURIComponent(code)}/messages${page(cursor)}`,
  )
}

export async function myRestrictionAction(courseSlug: string) {
  return call<MyRestriction>(`${course(courseSlug)}/forum/my-restriction`)
}

// Popover de @ (pública na API)
export async function searchSubjectsAction(courseSlug: string, q: string) {
  const term = q.trim()
  if (!term) return { ok: true, data: [] } as ForumResult<SubjectSearchResult[]>
  const result = await callApi<SubjectSearchResult[]>(
    `${course(courseSlug)}/subjects/search?q=${encodeURIComponent(term)}&limit=8`,
  )
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } } as ForumResult<never>
}

export async function conversationAction(id: string) {
  return call<ConversationView>(message(id))
}

export async function repliesAction(id: string, cursor?: string) {
  return call<MessagePage>(`${message(id)}/replies${page(cursor)}`)
}

export async function postMessageAction(
  courseSlug: string,
  input: MessageInput,
) {
  const parsed = messageInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]!.message)
  return call<MessageView>(`${course(courseSlug)}/forum/messages`, {
    method: 'POST',
    body: parsed.data,
  })
}

export async function replyAction(parentId: string, input: MessageInput) {
  const parsed = messageInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]!.message)
  return call<MessageView>(`${message(parentId)}/replies`, {
    method: 'POST',
    body: parsed.data,
  })
}

export async function editMessageAction(id: string, input: MessageInput) {
  const parsed = messageInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]!.message)
  return call<MessageView>(message(id), { method: 'PUT', body: parsed.data })
}

export async function deleteMessageAction(id: string) {
  return call<void>(message(id), { method: 'DELETE' })
}

export async function likeAction(id: string, liked: boolean) {
  return call<LikeState>(`${message(id)}/like`, {
    method: liked ? 'PUT' : 'DELETE',
  })
}

export async function reportAction(id: string, input: ReportInput) {
  const parsed = reportInputSchema.safeParse(input)
  if (!parsed.success) return invalid('Escolha um motivo')
  return call<void>(`${message(id)}/reports`, {
    method: 'POST',
    body: parsed.data,
  })
}
