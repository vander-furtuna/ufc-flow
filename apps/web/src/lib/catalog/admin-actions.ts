'use server'

import {
  addCurriculumSubjectInputSchema,
  branchInputSchema,
  branchSubjectsInputSchema,
  createCourseInputSchema,
  createCurriculumInputSchema,
  curriculumImportV1Schema,
  curriculumSubjectInputSchema,
  resolveReviewPointInputSchema,
  updateCourseInputSchema,
  updateCurriculumInputSchema,
  type AddCurriculumSubjectInput,
  type BranchInput,
  type BranchSubjectsInput,
  type CourseDetail,
  type CreateCourseInput,
  type CreateCurriculumInput,
  type CurriculumImportDetail,
  type CurriculumImportView,
  type CurriculumSubjectInput,
  type ManagedCurriculum,
  type ProblemDetails,
  type ReviewResolution,
  type SigaaCourseRefresh,
  type SubjectView,
  type UpdateCourseInput,
  type UpdateCurriculumInput,
} from '@ufc-flow/contracts'
import { updateTag } from 'next/cache'
import type { z } from 'zod'

import { CATALOG_TAG } from './public-catalog'

import { adminFetch } from './admin-api'

export type CatalogResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'errors'> }

const invalid = (detail = 'Confira os campos'): CatalogResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail },
})

// Valida no servidor com o mesmo schema da API antes de chamar
async function call<T>(
  path: string,
  method: string,
  body?: { schema: z.ZodType; value: unknown },
): Promise<CatalogResult<T>> {
  let payload: unknown
  if (body) {
    const parsed = body.schema.safeParse(body.value)
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message)
    payload = parsed.data
  }
  const result = await adminFetch<T>(path, { method, body: payload })
  // Mudou algo que pode estar publicado: as telas públicas releem a API
  if (result.ok && method !== 'GET') updateTag(CATALOG_TAG)
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, problem: result.problem }
}

const curriculum = (id: string) =>
  `/v1/manage/curricula/${encodeURIComponent(id)}`

export async function updateCurriculumAction(
  id: string,
  input: UpdateCurriculumInput,
) {
  return call<ManagedCurriculum>(curriculum(id), 'PATCH', {
    schema: updateCurriculumInputSchema,
    value: input,
  })
}

export async function createCurriculumAction(
  courseId: string,
  input: CreateCurriculumInput,
) {
  return call<ManagedCurriculum>(
    `/v1/manage/courses/${encodeURIComponent(courseId)}/curricula`,
    'POST',
    { schema: createCurriculumInputSchema, value: input },
  )
}

export async function deleteCurriculumAction(id: string) {
  return call<void>(curriculum(id), 'DELETE')
}

export async function addCurriculumSubjectAction(
  id: string,
  input: AddCurriculumSubjectInput,
) {
  return call<ManagedCurriculum>(`${curriculum(id)}/subjects`, 'POST', {
    schema: addCurriculumSubjectInputSchema,
    value: input,
  })
}

export async function updateCurriculumSubjectAction(
  id: string,
  code: string,
  input: CurriculumSubjectInput,
) {
  return call<ManagedCurriculum>(
    `${curriculum(id)}/subjects/${encodeURIComponent(code)}`,
    'PUT',
    { schema: curriculumSubjectInputSchema, value: input },
  )
}

export async function removeCurriculumSubjectAction(id: string, code: string) {
  return call<ManagedCurriculum>(
    `${curriculum(id)}/subjects/${encodeURIComponent(code)}`,
    'DELETE',
  )
}

export async function createBranchAction(id: string, input: BranchInput) {
  return call<ManagedCurriculum>(`${curriculum(id)}/branches`, 'POST', {
    schema: branchInputSchema,
    value: input,
  })
}

export async function updateBranchAction(
  id: string,
  branchId: string,
  input: BranchInput,
) {
  return call<ManagedCurriculum>(
    `${curriculum(id)}/branches/${encodeURIComponent(branchId)}`,
    'PUT',
    { schema: branchInputSchema, value: input },
  )
}

export async function removeBranchAction(id: string, branchId: string) {
  return call<ManagedCurriculum>(
    `${curriculum(id)}/branches/${encodeURIComponent(branchId)}`,
    'DELETE',
  )
}

export async function setBranchSubjectsAction(
  id: string,
  branchId: string,
  input: BranchSubjectsInput,
) {
  return call<ManagedCurriculum>(
    `${curriculum(id)}/branches/${encodeURIComponent(branchId)}/subjects`,
    'PUT',
    { schema: branchSubjectsInputSchema, value: input },
  )
}

export async function publishCurriculumAction(id: string) {
  return call<ManagedCurriculum>(`${curriculum(id)}/publish`, 'POST')
}

export async function makeCurrentAction(id: string) {
  return call<ManagedCurriculum>(`${curriculum(id)}/make-current`, 'POST')
}

// Disciplina do catálogo global, para o diálogo "+ Disciplina"
export async function findSubjectAction(code: string) {
  const result = await call<SubjectView[]>(
    `/v1/subjects?codes=${encodeURIComponent(code.trim().toUpperCase())}`,
    'GET',
  )
  return result.ok
    ? { ok: true as const, data: result.data[0] ?? null }
    : result
}

const imports = (id: string) =>
  `/v1/ingestion/curriculum-imports/${encodeURIComponent(id)}`

export async function resolveReviewPointAction(
  importId: string,
  key: string,
  resolution: ReviewResolution,
) {
  return call<ManagedCurriculum>(
    `${imports(importId)}/review-points/${encodeURIComponent(key)}/resolve`,
    'POST',
    { schema: resolveReviewPointInputSchema, value: { resolution } },
  )
}

export async function applyImportAction(id: string) {
  return call<CurriculumImportDetail>(`${imports(id)}/apply`, 'POST')
}

export async function discardImportAction(id: string) {
  return call<CurriculumImportView>(`${imports(id)}/discard`, 'POST')
}

// Upload do JSON baixado pela extensão: o mesmo endpoint, com source=UPLOAD
export async function uploadImportAction(text: string) {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return invalid('O arquivo não é um JSON válido')
  }
  const parsed = curriculumImportV1Schema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return invalid(
      `O arquivo não segue o formato CurriculumImportV1${
        issue ? ` (${issue.path.join('.')}: ${issue.message})` : ''
      }`,
    )
  }
  return call<CurriculumImportView>(
    '/v1/ingestion/curriculum-imports?source=UPLOAD',
    'POST',
    { schema: curriculumImportV1Schema, value: parsed.data },
  )
}

export async function createCourseAction(input: CreateCourseInput) {
  return call<CourseDetail>('/v1/admin/courses', 'POST', {
    schema: createCourseInputSchema,
    value: input,
  })
}

export async function updateCourseAction(id: string, input: UpdateCourseInput) {
  return call<CourseDetail>(
    `/v1/admin/courses/${encodeURIComponent(id)}`,
    'PATCH',
    {
      schema: updateCourseInputSchema,
      value: input,
    },
  )
}

export async function deleteCourseAction(id: string) {
  return call<void>(`/v1/admin/courses/${encodeURIComponent(id)}`, 'DELETE')
}

export async function refreshSigaaCatalogAction() {
  return call<SigaaCourseRefresh>('/v1/admin/sigaa-courses/refresh', 'POST')
}
