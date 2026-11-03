'use client'

import type { PostType, PostStatus } from '@ufc-flow/contracts'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'

import { useSession } from '@/lib/auth/use-session'
import { POLL_MS } from '@/lib/notifications/use-notifications'

import {
  hubDeadlinesAction,
  hubFeedAction,
  hubUnreadAction,
  linkPreviewAction,
  markHubReadAction,
  type HubResult,
} from './hub-actions'

export const HUB_KEY = ['hub'] as const

const unwrap = <T>(result: HubResult<T>): T => {
  if (!result.ok) throw new Error(result.problem.detail ?? 'Indisponível')
  return result.data
}

export function useHubFeed(
  courseSlug: string,
  filter: { type?: PostType; q?: string; status: PostStatus },
) {
  const { isPending: isSessionPending } = useSession()
  return useInfiniteQuery({
    queryKey: [...HUB_KEY, courseSlug, 'feed', filter],
    queryFn: async ({ pageParam }) =>
      unwrap(
        await hubFeedAction(courseSlug, {
          ...filter,
          cursor: pageParam ?? undefined,
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    // Espera a sessão para quem modera já ver os rascunhos na primeira leitura
    enabled: !isSessionPending,
  })
}

export function useHubDeadlines(courseSlug: string) {
  return useQuery({
    queryKey: [...HUB_KEY, courseSlug, 'deadlines'],
    queryFn: async () => unwrap(await hubDeadlinesAction(courseSlug)),
  })
}

// Página de links despublicada responde 404: o bloco some
export function useLinkPreview(courseSlug: string) {
  return useQuery({
    queryKey: [...HUB_KEY, courseSlug, 'links'],
    queryFn: async () => {
      const result = await linkPreviewAction(courseSlug)
      if (!result.ok && result.problem.status === 404) return null
      return unwrap(result)
    },
  })
}

const unreadKey = (courseSlug: string) =>
  [...HUB_KEY, courseSlug, 'unread'] as const

// Badge de novidades na aba Hub e no menu (D84), no mesmo ritmo do sino
export function useHubUnread(courseSlug: string | undefined) {
  const { data: user } = useSession()
  return useQuery({
    queryKey: unreadKey(courseSlug ?? ''),
    queryFn: async () => unwrap(await hubUnreadAction(courseSlug!)).count,
    enabled: Boolean(user && courseSlug),
    refetchInterval: POLL_MS,
    staleTime: POLL_MS / 2,
  })
}

// Abrir o hub zera as novidades
export function useMarkHubRead(courseSlug: string) {
  const { data: user } = useSession()
  const queryClient = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: async () => unwrap(await markHubReadAction(courseSlug)),
    onSuccess: () => queryClient.setQueryData(unreadKey(courseSlug), 0),
  })
  const userId = user?.id
  useEffect(() => {
    if (userId) mutate()
  }, [userId, courseSlug, mutate])
}

// Quem modera o curso (ou admin) escreve no hub; a API confere de novo
export function useCanManageHub(courseSlug: string) {
  const { data: user } = useSession()
  return Boolean(
    user &&
    (user.roles.includes('ADMIN') ||
      user.moderatedCourses.some((course) => course.slug === courseSlug)),
  )
}

export function useInvalidateHub() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: HUB_KEY })
}
