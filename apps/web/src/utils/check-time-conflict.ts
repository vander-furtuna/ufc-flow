import {
  findConflictingSections,
  isValidTime,
  type TimeSlot,
  type Weekday,
} from '@ufc-flow/academic-core'

import type { ClassSection } from '@/types/class'

const WEEKDAYS: Record<string, Weekday> = {
  SEG: 1,
  TER: 2,
  QUA: 3,
  QUI: 4,
  SEX: 5,
  SAB: 6,
  DOM: 7,
}

// "8:00" vira "08:00"; horários fora do formato são descartados
const toTime = (time: string) => (/^\d:\d{2}/.test(time) ? `0${time}` : time)

// Horários da turma no formato do academic-core. O cache local pode ter dados
// antigos, então dias e horários inválidos são ignorados em vez de quebrar.
const toSlots = (section: ClassSection): TimeSlot[] =>
  section.schedule.flatMap((slot) => {
    const weekday = WEEKDAYS[slot.day.toUpperCase()]
    const startTime = toTime(slot.startTime)
    const endTime = toTime(slot.endTime)
    if (!weekday || !isValidTime(startTime) || !isValidTime(endTime)) {
      return []
    }
    return [{ weekday, startTime, endTime }]
  })

export const checkTimeConflict = (
  newClass: ClassSection,
  existingClasses: ClassSection[],
): ClassSection[] =>
  findConflictingSections(
    { id: newClass.id, slots: toSlots(newClass) },
    existingClasses.map((section) => ({
      id: section.id,
      slots: toSlots(section),
      section,
    })),
  ).map(({ section }) => section)
