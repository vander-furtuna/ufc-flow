import { compareTerms, parseTerm } from '@ufc-flow/academic-core'
import type { EnrollmentStatus } from '@ufc-flow/contracts'

import { AcademicRecordErrors } from './errors'

export type Enrollment = {
  id: string
  userId: string
  courseId: string
  curriculumId: string
  registrationNumber: string
  status: EnrollmentStatus
  // Só uma atual por pessoa
  isCurrent: boolean
  entryTerm: string | null
  createdAt: Date
  updatedAt: Date
}

const isAfter = (term: string, reference: string) =>
  compareTerms(parseTerm(term)!, parseTerm(reference)!) > 0

type EnrollInput = {
  current: Enrollment | null
  id: string
  userId: string
  courseId: string
  curriculumId: string
  registrationNumber: string
  entryTerm: string | null
  currentTerm: string | null
  now: Date
}

// Nova matrícula. Com a atual em outro curso, é transferência interna: a
// antiga vira TRANSFERRED e deixa de ser a atual.
export function enroll(input: EnrollInput): {
  enrollment: Enrollment
  transferred: Enrollment | null
} {
  const { current, now } = input
  if (current?.courseId === input.courseId) {
    throw AcademicRecordErrors.enrollmentExists()
  }
  if (
    input.entryTerm &&
    input.currentTerm &&
    isAfter(input.entryTerm, input.currentTerm)
  ) {
    throw AcademicRecordErrors.entryTermInFuture()
  }
  return {
    enrollment: {
      id: input.id,
      userId: input.userId,
      courseId: input.courseId,
      curriculumId: input.curriculumId,
      registrationNumber: input.registrationNumber,
      status: 'ACTIVE',
      isCurrent: true,
      entryTerm: input.entryTerm,
      createdAt: now,
      updatedAt: now,
    },
    transferred: current
      ? { ...current, status: 'TRANSFERRED', isCurrent: false, updatedAt: now }
      : null,
  }
}

// Migrar de EC no mesmo curso só troca a EC: os registros apontam para a
// disciplina global e o progresso é recalculado
export function changeCurriculum(
  enrollment: Enrollment,
  curriculumId: string,
  now: Date,
): Enrollment {
  if (!enrollment.isCurrent || enrollment.status !== 'ACTIVE') {
    throw AcademicRecordErrors.enrollmentNotActive()
  }
  return { ...enrollment, curriculumId, updatedAt: now }
}
