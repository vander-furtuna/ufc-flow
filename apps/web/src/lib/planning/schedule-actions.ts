'use server'

import {
  scheduleImportInputSchema,
  scheduleInputSchema,
  termSchema,
  slugSchema,
  uuidSchema,
  type ProblemDetails,
  type ScheduleImportInput,
  type ScheduleImportResponse,
  type ScheduleInput,
  type ScheduleListQuery,
  type ScheduleView,
} from '@ufc-flow/contracts'

import { userFetch } from '@/lib/auth/user-api'
import { getCourseSections } from '@/lib/classes/classes-api'

import { sectionKey } from './import-candidates'

export type PlanningResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: Pick<ProblemDetails, 'code' | 'detail' | 'status'> }

const invalid = (detail: string): PlanningResult<never> => ({
  ok: false,
  problem: { code: 'VALIDATION_FAILED', detail, status: 400 },
})

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<PlanningResult<T>> {
  const result = await userFetch<T>(path, init)
  if (result.ok) return result
  const { code, detail, status } = result.problem
  return { ok: false, problem: { code, detail, status } }
}

const schedulePath = (id: string) =>
  `/v1/me/schedules/${encodeURIComponent(id)}`

export async function listSchedulesAction(query: ScheduleListQuery) {
  const params = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  )
  return call<ScheduleView[]>(`/v1/me/schedules?${params.toString()}`)
}

export async function saveScheduleAction(id: string, input: ScheduleInput) {
  const parsed = scheduleInputSchema.safeParse(input)
  if (!uuidSchema.safeParse(id).success || !parsed.success) {
    return invalid(parsed.error?.issues[0]?.message ?? 'Agenda inválida')
  }
  return call<ScheduleView>(schedulePath(id), {
    method: 'PUT',
    body: parsed.data,
  })
}

export async function deleteScheduleAction(id: string) {
  if (!uuidSchema.safeParse(id).success) return invalid('Agenda inválida')
  return call<void>(schedulePath(id), { method: 'DELETE' })
}

export async function importSchedulesAction(input: ScheduleImportInput) {
  const parsed = scheduleImportInputSchema.safeParse(input)
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? 'Importação inválida')
  }
  return call<ScheduleImportResponse>('/v1/me/schedules/import', {
    method: 'POST',
    body: parsed.data,
  })
}

export type ImportPreview = Record<
  string,
  { available: boolean; sections: string[] }
>

// Antes de importar: em cada semestre e curso, quais turmas a API coletou.
// Semestre sem coleta no Flow não dá para importar.
export async function previewImportAction(
  targets: { term: string; courseSlug: string }[],
): Promise<ImportPreview> {
  const preview: ImportPreview = {}
  for (const { term, courseSlug } of targets.slice(0, 50)) {
    const key = `${term}|${courseSlug}`
    if (preview[key]) continue
    if (
      !termSchema.safeParse(term).success ||
      !slugSchema.safeParse(courseSlug).success
    ) {
      preview[key] = { available: false, sections: [] }
      continue
    }
    const data = await getCourseSections(term, courseSlug).catch(() => null)
    preview[key] = {
      available: data !== null,
      sections: (data?.subjects ?? []).flatMap((subject) =>
        subject.sections.map((section) =>
          sectionKey(subject.code, section.sectionCode),
        ),
      ),
    }
  }
  return preview
}
