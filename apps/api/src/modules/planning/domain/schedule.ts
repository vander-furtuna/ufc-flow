import {
  checkScheduleAddition,
  type ScheduleSection,
  type TimeSlot,
} from '@ufc-flow/academic-core'
import type { ScheduleColor } from '@ufc-flow/contracts'

import { PlanningErrors } from './errors'

// Turma como a agenda a enxerga: dados atuais da coleta
export type SectionSnapshot = {
  id: string
  termId: string
  subjectCode: string
  sectionCode: string
  slots: TimeSlot[]
  fingerprint: string
  removed: boolean
}

export type ScheduleItem = {
  sectionId: string
  subjectCode: string
  color: ScheduleColor
  // Fingerprint da turma quando entrou (ou quando o aviso foi dispensado)
  slotsFingerprint: string
  addedAt: Date
}

// Agenda de um curso, numa EC e num semestre (D71), gravada inteira
export type Schedule = {
  id: string
  userId: string
  courseId: string
  curriculumId: string
  termId: string
  name: string
  position: number
  createdAt: Date
  updatedAt: Date
  items: ScheduleItem[]
}

export type ItemInput = {
  sectionId: string
  color: ScheduleColor
  acknowledgeChange?: boolean
}

const asScheduleSection = (section: SectionSnapshot): ScheduleSection => ({
  id: section.id,
  subjectCode: section.subjectCode,
  slots: section.slots,
})

const violationError = (code: string) =>
  code === 'SCHEDULE_DUPLICATE_SUBJECT'
    ? PlanningErrors.duplicateSubject()
    : PlanningErrors.timeConflict()

// Troca os itens da agenda. Turma nova não pode repetir disciplina, conflitar
// no horário nem estar removida. As que já estavam ficam mesmo se o SIGAA
// mudou o horário depois: o aviso de horário alterado cuida disso.
export function replaceItems(params: {
  current: readonly ScheduleItem[]
  input: readonly ItemInput[]
  sections: ReadonlyMap<string, SectionSnapshot>
  termId: string
  now: Date
}): ScheduleItem[] {
  const { current, input, sections, termId, now } = params
  const previous = new Map(current.map((item) => [item.sectionId, item]))
  const resolved = input.map((item) => {
    const section = sections.get(item.sectionId)
    if (!section || section.termId !== termId) {
      throw PlanningErrors.sectionNotFound()
    }
    return { item, section, isNew: !previous.has(section.id) }
  })

  const seenSubjects = new Set<string>()
  for (const { section } of resolved) {
    if (seenSubjects.has(section.subjectCode)) {
      throw PlanningErrors.duplicateSubject()
    }
    seenSubjects.add(section.subjectCode)
  }

  resolved.forEach(({ section, isNew }, index) => {
    if (!isNew) return
    if (section.removed) throw PlanningErrors.sectionRemoved()
    const others = resolved
      .filter((_, other) => other !== index)
      .map((entry) => asScheduleSection(entry.section))
    const [violation] = checkScheduleAddition(
      others,
      asScheduleSection(section),
    )
    if (violation) throw violationError(violation.code)
  })

  return resolved.map(({ item, section }) => {
    const before = previous.get(section.id)
    return {
      sectionId: section.id,
      subjectCode: section.subjectCode,
      color: item.color,
      slotsFingerprint:
        before && !item.acknowledgeChange
          ? before.slotsFingerprint
          : section.fingerprint,
      addedAt: before?.addedAt ?? now,
    }
  })
}

export type SkippedItem = {
  sectionId: string
  reason: 'SCHEDULE_DUPLICATE_SUBJECT' | 'SCHEDULE_TIME_CONFLICT'
}

// Importação de agenda local: as turmas entram na ordem, e a que repete a
// disciplina ou conflita com as anteriores fica de fora, com o motivo
export function importItems(
  entries: readonly { section: SectionSnapshot; color: ScheduleColor }[],
  now: Date,
): { items: ScheduleItem[]; skipped: SkippedItem[] } {
  const accepted: SectionSnapshot[] = []
  const items: ScheduleItem[] = []
  const skipped: SkippedItem[] = []
  for (const { section, color } of entries) {
    // A mesma turma duas vezes também é disciplina repetida
    if (accepted.some((item) => item.id === section.id)) {
      skipped.push({
        sectionId: section.id,
        reason: 'SCHEDULE_DUPLICATE_SUBJECT',
      })
      continue
    }
    const [violation] = checkScheduleAddition(
      accepted.map(asScheduleSection),
      asScheduleSection(section),
    )
    if (violation) {
      skipped.push({ sectionId: section.id, reason: violation.code })
      continue
    }
    accepted.push(section)
    items.push({
      sectionId: section.id,
      subjectCode: section.subjectCode,
      color,
      slotsFingerprint: section.fingerprint,
      addedAt: now,
    })
  }
  return { items, skipped }
}
