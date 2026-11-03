'use client'

import type {
  ConversationView,
  MessagePage,
  MessageView,
} from '@ufc-flow/contracts'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'

import { useCurrentEnrollment } from '@/lib/academic-record/use-academic'
import { useSession } from '@/lib/auth/use-session'
import { POLL_MS } from '@/lib/notifications/use-notifications'

import {
  conversationAction,
  myRestrictionAction,
  newCountAction,
  repliesAction,
  searchSubjectsAction,
  subjectMessagesAction,
  timelineAction,
  trendingAction,
  type ForumResult,
} from './forum-actions'

export const FORUM_KEY = ['forum'] as const

export const unwrap = <T>(result: ForumResult<T>): T => {
  if (!result.ok) {
    throw Object.assign(new Error(result.problem.detail ?? 'Indisponível'), {
      code: result.problem.code,
    })
  }
  return result.data
}

// Código estável do erro da API (ex.: FORUM_BANNED)
export const errorCode = (error: unknown) =>
  (error as { code?: string } | null)?.code

const timelineKey = (courseSlug: string) =>
  [...FORUM_KEY, courseSlug, 'timeline'] as const

export function useTimeline(courseSlug: string) {
  return useInfiniteQuery({
    queryKey: timelineKey(courseSlug),
    queryFn: async ({ pageParam }) =>
      unwrap(await timelineAction(courseSlug, pageParam ?? undefined)),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
}

// "N novas mensagens": a cada 60 s, desde a mais nova carregada
export function useNewMessages(courseSlug: string, since: string | null) {
  return useQuery({
    queryKey: [...FORUM_KEY, courseSlug, 'new', since],
    queryFn: async () => unwrap(await newCountAction(courseSlug, since!)).count,
    enabled: Boolean(since),
    refetchInterval: POLL_MS,
    staleTime: POLL_MS / 2,
  })
}

export function useTrending(courseSlug: string) {
  return useQuery({
    queryKey: [...FORUM_KEY, courseSlug, 'trending'],
    queryFn: async () => unwrap(await trendingAction(courseSlug)),
  })
}

export function useMyRestriction(courseSlug: string) {
  const { data: user } = useSession()
  return useQuery({
    queryKey: [...FORUM_KEY, courseSlug, 'restriction'],
    queryFn: async () => unwrap(await myRestrictionAction(courseSlug)),
    enabled: Boolean(user),
  })
}

export function useSubjectSearch(courseSlug: string, query: string | null) {
  return useQuery({
    queryKey: [...FORUM_KEY, courseSlug, 'subjects', query],
    queryFn: async () => unwrap(await searchSubjectsAction(courseSlug, query!)),
    enabled: Boolean(query),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  })
}

export const conversationKey = (id: string) =>
  [...FORUM_KEY, 'conversation', id] as const

export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKey(id),
    queryFn: async () => unwrap(await conversationAction(id)),
  })
}

// Respostas depois da primeira página (que vem com a conversa)
export function useMoreReplies(id: string, cursor: string | null) {
  return useInfiniteQuery({
    queryKey: [...FORUM_KEY, 'replies', id, cursor],
    queryFn: async ({ pageParam }) =>
      unwrap(await repliesAction(id, pageParam ?? undefined)),
    initialPageParam: cursor,
    getNextPageParam: (page) => page.nextCursor,
    enabled: false,
  })
}

export function useSubjectMessages(courseSlug: string, code: string) {
  const { data: user } = useSession()
  return useInfiniteQuery({
    queryKey: [...FORUM_KEY, courseSlug, 'subject', code],
    queryFn: async ({ pageParam }) =>
      unwrap(
        await subjectMessagesAction(courseSlug, code, pageParam ?? undefined),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(user),
  })
}

// Quem escreve: matrícula ativa no curso, moderação ou admin; a API confere
export function useCanPost(courseSlug: string) {
  const { data: user } = useSession()
  const { enrollment } = useCurrentEnrollment()
  if (!user) return false
  return (
    user.roles.includes('ADMIN') ||
    user.moderatedCourses.some((course) => course.slug === courseSlug) ||
    (enrollment?.course.slug === courseSlug && enrollment.status === 'ACTIVE')
  )
}

// Troca uma mensagem em todas as listas e conversas já carregadas
export function useUpdateMessage() {
  const queryClient = useQueryClient()
  return (id: string, update: (message: MessageView) => MessageView) => {
    const patch = (message: MessageView) =>
      message.id === id ? update(message) : message
    queryClient.setQueriesData<InfiniteData<MessagePage>>(
      { queryKey: FORUM_KEY, predicate: (query) => isPages(query.state.data) },
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map(patch),
          })),
        },
    )
    queryClient.setQueriesData<ConversationView>(
      { queryKey: [...FORUM_KEY, 'conversation'] },
      (data) =>
        data && {
          ...data,
          ancestors: data.ancestors.map(patch),
          message: patch(data.message),
          replies: { ...data.replies, items: data.replies.items.map(patch) },
        },
    )
  }
}

const isPages = (data: unknown): data is InfiniteData<MessagePage> =>
  typeof data === 'object' && data !== null && 'pages' in data

export function useInvalidateForum() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: FORUM_KEY })
}
