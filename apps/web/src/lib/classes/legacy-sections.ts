import type { CourseSections } from '@ufc-flow/contracts'

import type { SubjectGroup } from '@/types/class'

// Dia ISO (1 = segunda, D24) para a sigla que a agenda local usa
const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const

// Turmas da API no formato que o /api/scrapping sempre devolveu. Os ids agora
// são estáveis entre coletas (chave natural no banco).
export function toLegacySubjectGroups(data: CourseSections): SubjectGroup[] {
  return data.subjects.map((subject) => ({
    code: subject.code,
    name: subject.name,
    classes: subject.sections.map((section) => ({
      id: section.id,
      term: data.term,
      sectionId: section.sectionCode,
      instructors: section.instructors,
      reservedSeats: section.reservedSeats,
      schedule: section.slots.map((slot) => ({
        id: `${section.id}-${slot.weekday}-${slot.startTime}`,
        day: WEEKDAYS[slot.weekday - 1] ?? 'SEG',
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      validity: {
        startDate: section.validFrom ?? '',
        endDate: section.validTo ?? '',
      },
      code: subject.code,
      name: subject.name,
    })),
  }))
}
