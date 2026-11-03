'use server'

import {
  changeCurriculumInputSchema,
  closeSubjectRecordInputSchema,
  enrollmentInputSchema,
  subjectRecordInputSchema,
  type AcademicSummary,
  type ChangeCurriculumInput,
  type CloseSubjectRecordInput,
  type EnrollmentInput,
  type EnrollmentView,
  type ProblemDetails,
  type SubjectRecordInput,
  type SubjectRecordView,
  type SubjectView,
} from '@ufc-flow/contracts'

import { userFetch } from '@/lib/auth/user-api'

export type AcademicResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<AcademicResult<T>> {
  const result = await userFetch<T>(path, init)
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const invalid = (detail: string): AcademicResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail, status: 400 },
})

const id = (value: string) => encodeURIComponent(value)

export async function listEnrollmentsAction() {
  return call<EnrollmentView[]>('/v1/me/enrollments')
}

export async function createEnrollmentAction(input: EnrollmentInput) {
  const parsed = enrollmentInputSchema.safeParse(input)
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? 'Matrícula inválida')
  }
  return call<EnrollmentView>('/v1/me/enrollments', {
    method: 'POST',
    body: parsed.data,
  })
}

export async function changeCurriculumAction(
  enrollmentId: string,
  input: ChangeCurriculumInput,
) {
  const parsed = changeCurriculumInputSchema.safeParse(input)
  if (!parsed.success) return invalid('Estrutura curricular inválida')
  return call<EnrollmentView>(
    `/v1/me/enrollments/${id(enrollmentId)}/curriculum`,
    { method: 'PATCH', body: parsed.data },
  )
}

export async function getSummaryAction(enrollmentId: string) {
  return call<AcademicSummary>(`/v1/me/enrollments/${id(enrollmentId)}/summary`)
}

export async function listRecordsAction(enrollmentId: string) {
  return call<SubjectRecordView[]>(
    `/v1/me/enrollments/${id(enrollmentId)}/records`,
  )
}

export async function addRecordAction(
  enrollmentId: string,
  input: SubjectRecordInput,
) {
  const parsed = subjectRecordInputSchema.safeParse(input)
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? 'Registro inválido')
  }
  return call<SubjectRecordView>(
    `/v1/me/enrollments/${id(enrollmentId)}/records`,
    { method: 'POST', body: parsed.data },
  )
}

export async function closeRecordAction(
  recordId: string,
  input: CloseSubjectRecordInput,
) {
  const parsed = closeSubjectRecordInputSchema.safeParse(input)
  if (!parsed.success) return invalid('Situação inválida')
  return call<SubjectRecordView>(`/v1/me/records/${id(recordId)}`, {
    method: 'PATCH',
    body: parsed.data,
  })
}

export async function deleteRecordAction(recordId: string) {
  return call<void>(`/v1/me/records/${id(recordId)}`, { method: 'DELETE' })
}

// Disciplina fora da EC, pelo código, no catálogo global
export async function findSubjectAction(code: string) {
  const result = await call<SubjectView[]>(
    `/v1/subjects?codes=${encodeURIComponent(code.trim().toUpperCase())}`,
  )
  return result.ok
    ? { ok: true as const, data: result.data[0] ?? null }
    : result
}
