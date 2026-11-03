import type { ActivityKind } from '@ufc-flow/academic-core'

import { AcademicRecordErrors } from './errors'

// Categoria do regulamento do curso, cadastrada por EC (moderadores)
export type ActivityCategory = {
  id: string
  curriculumId: string
  kind: ActivityKind
  name: string
  maxHours: number | null
  position: number
}

// Atividade complementar ou de extensão declarada pelo aluno
export type Activity = {
  id: string
  enrollmentId: string
  kind: ActivityKind
  categoryId: string | null
  title: string
  description: string | null
  institution: string | null
  hours: number
  startedOn: string
  endedOn: string | null
  certificateFileId: string | null
  createdAt: Date
  updatedAt: Date
}

// A categoria, quando há, é da EC da matrícula e do mesmo tipo da atividade
export function checkActivityCategory(
  categoryId: string | null,
  kind: ActivityKind,
  curriculumId: string,
  categories: readonly Pick<ActivityCategory, 'id' | 'curriculumId' | 'kind'>[],
): void {
  if (categoryId === null) return
  const category = categories.find(
    (item) => item.id === categoryId && item.curriculumId === curriculumId,
  )
  if (!category) throw AcademicRecordErrors.categoryNotFound()
  if (category.kind !== kind) throw AcademicRecordErrors.categoryKindMismatch()
}
