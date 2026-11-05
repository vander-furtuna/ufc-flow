'use client'

import { useQuery } from '@tanstack/react-query'

import { useSession } from '@/lib/auth/use-session'

import {
  criteriaAction,
  evaluationSummaryAction,
  myEvaluationAction,
  type EvaluationResult,
} from './evaluation-actions'

export const EVALUATION_KEY = ['evaluation'] as const

const unwrap = <T>(result: EvaluationResult<T>): T => {
  if (!result.ok) throw new Error(result.problem.detail ?? 'Indisponível')
  return result.data
}

export function useEvaluationSummary(code: string) {
  return useQuery({
    queryKey: [...EVALUATION_KEY, 'summary', code],
    queryFn: async () => unwrap(await evaluationSummaryAction(code)),
  })
}

export function useMyEvaluation(code: string) {
  const { data: user } = useSession()
  return useQuery({
    queryKey: [...EVALUATION_KEY, 'mine', code],
    queryFn: async () => unwrap(await myEvaluationAction(code)),
    enabled: Boolean(user),
  })
}

export function useCriteria() {
  return useQuery({
    queryKey: [...EVALUATION_KEY, 'criteria'],
    queryFn: async () => unwrap(await criteriaAction()),
  })
}
