'use server'

import {
  postInputSchema,
  type HubDeadline,
  type HubFeed,
  type HubUnread,
  type LinkPagePreview,
  type PostInput,
  type PostStatus,
  type PostType,
  type PostView,
  type ProblemDetails,
} from '@ufc-flow/contracts'

import { userFetch } from '@/lib/auth/user-api'

export type HubResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

// Sem login, o userFetch vai sem token e a API responde como anônimo
async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<HubResult<T>> {
  const result = await userFetch<T>(path, init)
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const course = (slug: string) => `/v1/courses/${encodeURIComponent(slug)}`

export type HubFeedQuery = {
  type?: PostType
  q?: string
  status?: PostStatus
  cursor?: string
}

export async function hubFeedAction(courseSlug: string, query: HubFeedQuery) {
  const params = new URLSearchParams({ limit: '20' })
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  return call<HubFeed>(`${course(courseSlug)}/hub?${params.toString()}`)
}

export async function hubDeadlinesAction(courseSlug: string) {
  return call<HubDeadline[]>(`${course(courseSlug)}/hub/deadlines`)
}

// "Links importantes": os 5 primeiros da página de links publicada
export async function linkPreviewAction(courseSlug: string) {
  return call<LinkPagePreview>(`${course(courseSlug)}/link-page/preview`)
}

export async function hubUnreadAction(courseSlug: string) {
  return call<HubUnread>(`/v1/me/hub-reads/${encodeURIComponent(courseSlug)}`)
}

export async function markHubReadAction(courseSlug: string) {
  return call<void>(`/v1/me/hub-reads/${encodeURIComponent(courseSlug)}`, {
    method: 'PUT',
  })
}

const invalid = (): HubResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail: 'Post inválido', status: 400 },
})

// Sem curso, o post é institucional (só admin)
export async function createPostAction(
  courseSlug: string | null,
  input: PostInput,
) {
  const parsed = postInputSchema.safeParse(input)
  if (!parsed.success) return invalid()
  return call<PostView>(
    courseSlug ? `${course(courseSlug)}/hub/posts` : '/v1/hub/posts',
    { method: 'POST', body: parsed.data },
  )
}

export async function updatePostAction(id: string, input: PostInput) {
  const parsed = postInputSchema.safeParse(input)
  if (!parsed.success) return invalid()
  return call<PostView>(`/v1/hub/posts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: parsed.data,
  })
}

export async function deletePostAction(id: string) {
  return call<void>(`/v1/hub/posts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
