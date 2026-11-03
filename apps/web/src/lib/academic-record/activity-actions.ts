'use server'

import {
  activityCategoryInputSchema,
  activityRecordInputSchema,
  type ActivityCategoryInput,
  type ActivityCategoryView,
  type ActivityRecordInput,
  type ActivityRecordView,
  type ProblemDetails,
} from '@ufc-flow/contracts'

import { userFetch } from '@/lib/auth/user-api'

export type ActivityResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ActivityResult<T>> {
  const result = await userFetch<T>(path, init)
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const invalid = (detail: string): ActivityResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail, status: 400 },
})

const id = (value: string) => encodeURIComponent(value)

// ——— Atividades do aluno ———

export async function listActivitiesAction(enrollmentId: string) {
  return call<ActivityRecordView[]>(
    `/v1/me/enrollments/${id(enrollmentId)}/activities`,
  )
}

export async function saveActivityAction(
  target: { enrollmentId: string } | { activityId: string },
  input: ActivityRecordInput,
) {
  const parsed = activityRecordInputSchema.safeParse(input)
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? 'Atividade inválida')
  }
  return 'activityId' in target
    ? call<ActivityRecordView>(`/v1/me/activities/${id(target.activityId)}`, {
        method: 'PUT',
        body: parsed.data,
      })
    : call<ActivityRecordView>(
        `/v1/me/enrollments/${id(target.enrollmentId)}/activities`,
        { method: 'POST', body: parsed.data },
      )
}

export async function deleteActivityAction(activityId: string) {
  return call<void>(`/v1/me/activities/${id(activityId)}`, {
    method: 'DELETE',
  })
}

// ——— Categorias por EC (moderador do curso ou admin) ———

const categories = (curriculumId: string) =>
  `/v1/manage/curricula/${id(curriculumId)}/activity-categories`

export async function listCategoriesAction(curriculumId: string) {
  return call<ActivityCategoryView[]>(categories(curriculumId))
}

export async function saveCategoryAction(
  target: { curriculumId: string } | { categoryId: string },
  input: ActivityCategoryInput,
) {
  const parsed = activityCategoryInputSchema.safeParse(input)
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? 'Categoria inválida')
  }
  return 'categoryId' in target
    ? call<ActivityCategoryView>(
        `/v1/manage/activity-categories/${id(target.categoryId)}`,
        { method: 'PUT', body: parsed.data },
      )
    : call<ActivityCategoryView>(categories(target.curriculumId), {
        method: 'POST',
        body: parsed.data,
      })
}

export async function deleteCategoryAction(categoryId: string) {
  return call<void>(`/v1/manage/activity-categories/${id(categoryId)}`, {
    method: 'DELETE',
  })
}
