'use client'

import type { MarkNotificationsReadInput } from '@ufc-flow/contracts'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { useSession } from '@/lib/auth/use-session'

import {
  listNotificationsAction,
  markNotificationsReadAction,
  unreadCountAction,
} from './notification-actions'

export const NOTIFICATIONS_KEY = ['notifications'] as const

// O contador do sino é relido a cada 60 s (o mesmo intervalo que o fórum vai
// usar), só com a aba visível
export const POLL_MS = 60_000

const unwrap = <T>(
  result: { ok: true; data: T } | { ok: false; problem: { detail?: string } },
): T => {
  if (!result.ok) throw new Error(result.problem.detail ?? 'Indisponível')
  return result.data
}

export function useUnreadCount() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: async () => unwrap(await unreadCountAction()).count,
    enabled: Boolean(user),
    refetchInterval: POLL_MS,
    staleTime: POLL_MS / 2,
  })
}

export function useNotificationList(options: {
  unread: boolean
  enabled?: boolean
}) {
  const { data: user } = useSession()
  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list', options.unread],
    queryFn: async ({ pageParam }) =>
      unwrap(
        await listNotificationsAction({
          cursor: pageParam ?? undefined,
          unread: options.unread,
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(user) && (options.enabled ?? true),
    refetchInterval: POLL_MS,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MarkNotificationsReadInput) =>
      unwrap(await markNotificationsReadAction(input)),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}
