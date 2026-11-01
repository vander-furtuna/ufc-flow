import { findConflictingSections, hasTimeConflict } from './time-conflict'
import type { ScheduleSection, ScheduleViolation } from './types'

// Regras do agregado de agenda: no máximo uma turma por disciplina e nenhum
// conflito de horário. Lista vazia quando a agenda é válida.
export function validateSchedule(
  sections: readonly ScheduleSection[],
): ScheduleViolation[] {
  const violations: ScheduleViolation[] = []

  const bySubject = new Map<string, string[]>()
  for (const section of sections) {
    const ids = bySubject.get(section.subjectCode) ?? []
    ids.push(section.id)
    bySubject.set(section.subjectCode, ids)
  }
  for (const [subjectCode, sectionIds] of bySubject) {
    if (sectionIds.length > 1) {
      violations.push({
        code: 'SCHEDULE_DUPLICATE_SUBJECT',
        subjectCode,
        sectionIds,
      })
    }
  }

  sections.forEach((a, index) => {
    for (const b of sections.slice(index + 1)) {
      if (hasTimeConflict(a.slots, b.slots)) {
        violations.push({
          code: 'SCHEDULE_TIME_CONFLICT',
          sectionIds: [a.id, b.id],
        })
      }
    }
  })

  return violations
}

// O que impede acrescentar a turma à agenda. A própria turma, se já estiver
// na agenda, não é contada.
export function checkScheduleAddition(
  sections: readonly ScheduleSection[],
  candidate: ScheduleSection,
): ScheduleViolation[] {
  const others = sections.filter((section) => section.id !== candidate.id)
  const violations: ScheduleViolation[] = []

  const sameSubject = others.filter(
    (section) => section.subjectCode === candidate.subjectCode,
  )
  if (sameSubject.length > 0) {
    violations.push({
      code: 'SCHEDULE_DUPLICATE_SUBJECT',
      subjectCode: candidate.subjectCode,
      sectionIds: [...sameSubject.map((section) => section.id), candidate.id],
    })
  }

  for (const section of findConflictingSections(candidate, others)) {
    violations.push({
      code: 'SCHEDULE_TIME_CONFLICT',
      sectionIds: [section.id, candidate.id],
    })
  }

  return violations
}
