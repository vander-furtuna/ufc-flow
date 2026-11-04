'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useSession } from '@/lib/auth/use-session'
import { FORUM_KEY } from '@/lib/forum/use-forum'

import {
  pendingRequestsAction,
  reportQueueAction,
  restrictionsAction,
  summaryAction,
  type ModerationResult,
} from './moderation-actions'

export const MODERATION_KEY = ['moderation'] as const

const unwrap = <T>(result: ModerationResult<T>): T => {
  if (!result.ok) throw new Error(result.problem.detail ?? 'Indisponível')
  return result.data
}

export function useModerationSummary() {
  return useQuery({
    queryKey: [...MODERATION_KEY, 'summary'],
    queryFn: async () => unwrap(await summaryAction()),
  })
}

export function useReportQueue() {
  return useQuery({
    queryKey: [...MODERATION_KEY, 'reports'],
    queryFn: async () => unwrap(await reportQueueAction()),
  })
}

export function useRestrictions() {
  return useQuery({
    queryKey: [...MODERATION_KEY, 'restrictions'],
    queryFn: async () => unwrap(await restrictionsAction()),
  })
}

export function usePendingRequests(enabled: boolean) {
  return useQuery({
    queryKey: [...MODERATION_KEY, 'requests'],
    queryFn: async () => unwrap(await pendingRequestsAction()).items,
    enabled,
  })
}

// Depois de moderar: a fila, os contadores e o fórum mudam
export function useRefreshModeration() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: MODERATION_KEY }),
      queryClient.invalidateQueries({ queryKey: FORUM_KEY }),
    ])
}

// Moderação do curso ou admin (a API confere de novo)
export function useCanModerate(courseSlug: string) {
  const { data: user } = useSession()
  return Boolean(
    user &&
    (user.roles.includes('ADMIN') ||
      user.moderatedCourses.some((course) => course.slug === courseSlug)),
  )
}
