'use server'

import {
  evaluationCriteriaOrderSchema,
  evaluationCriterionInputSchema,
  evaluationInputSchema,
  type EvaluationCriterion,
  type EvaluationCriterionInput,
  type EvaluationInput,
  type MyEvaluation,
  type ProblemDetails,
  type SubjectEvaluationSummary,
} from '@ufc-flow/contracts'

import { callApi } from '@/lib/auth/api'
import { userFetch } from '@/lib/auth/user-api'

export type EvaluationResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

const pick = <T>(
  result: Awaited<ReturnType<typeof callApi<T>>>,
): EvaluationResult<T> => {
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const invalid = (detail: string): EvaluationResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail, status: 400 },
})

const subject = (code: string) => encodeURIComponent(code)

// Resumo público (também sem login)
export async function evaluationSummaryAction(code: string) {
  return pick(
    await callApi<SubjectEvaluationSummary>(
      `/v1/subjects/${subject(code)}/evaluations`,
    ),
  )
}

export async function myEvaluationAction(code: string) {
  return pick(
    await userFetch<MyEvaluation>(`/v1/me/evaluations/${subject(code)}`),
  )
}

export async function saveEvaluationAction(
  code: string,
  input: EvaluationInput,
) {
  const parsed = evaluationInputSchema.safeParse(input)
  if (!parsed.success) return invalid('Dê uma nota para cada critério')
  return pick(
    await userFetch<MyEvaluation>(`/v1/me/evaluations/${subject(code)}`, {
      method: 'PUT',
      body: parsed.data,
    }),
  )
}

export async function criteriaAction() {
  return pick(
    await userFetch<EvaluationCriterion[]>('/v1/admin/evaluation-criteria'),
  )
}

export async function saveCriterionAction(
  id: string | null,
  input: EvaluationCriterionInput,
) {
  const parsed = evaluationCriterionInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]!.message)
  return pick(
    await userFetch<EvaluationCriterion>(
      `/v1/admin/evaluation-criteria${id ? `/${encodeURIComponent(id)}` : ''}`,
      { method: id ? 'PUT' : 'POST', body: parsed.data },
    ),
  )
}

export async function reorderCriteriaAction(ids: string[]) {
  const parsed = evaluationCriteriaOrderSchema.safeParse({ ids })
  if (!parsed.success) return invalid('Ordem inválida')
  return pick(
    await userFetch<EvaluationCriterion[]>(
      '/v1/admin/evaluation-criteria/order',
      { method: 'PUT', body: parsed.data },
    ),
  )
}
