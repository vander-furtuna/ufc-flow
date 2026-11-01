import type { TimeSlot } from './types'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/

// "HH:MM" ou "HH:MM:SS", de 00:00 a 23:59
export function isValidTime(time: string): boolean {
  return TIME_PATTERN.test(time)
}

// Minutos desde a meia-noite. Os segundos são ignorados.
export function timeToMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time)
  if (!match) throw new RangeError(`Horário inválido: "${time}"`)
  return Number(match[1]) * 60 + Number(match[2])
}

// Sobrepõem quando caem no mesmo dia e um começa antes do outro terminar.
// Horários que só se encostam (10:00–12:00 e 12:00–14:00) não conflitam.
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  return (
    a.weekday === b.weekday &&
    timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
  )
}

export function hasTimeConflict(
  a: readonly TimeSlot[],
  b: readonly TimeSlot[],
): boolean {
  return a.some((slotA) => b.some((slotB) => slotsOverlap(slotA, slotB)))
}

// Turmas que conflitam com a candidata, sem contar ela mesma (mesmo id)
export function findConflictingSections<
  T extends { id: string; slots: readonly TimeSlot[] },
>(
  candidate: { id: string; slots: readonly TimeSlot[] },
  sections: readonly T[],
): T[] {
  return sections.filter(
    (section) =>
      section.id !== candidate.id &&
      hasTimeConflict(candidate.slots, section.slots),
  )
}
