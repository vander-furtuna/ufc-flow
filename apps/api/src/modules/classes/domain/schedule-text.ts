import type { TimeSlot, Weekday } from '@ufc-flow/academic-core'

const DAYS: Record<string, Weekday> = {
  SEG: 1,
  TER: 2,
  QUA: 3,
  QUI: 4,
  SEX: 5,
  SAB: 6,
  DOM: 7,
}

const SLOT = /^(SEG|TER|QUA|QUI|SEX|SAB|DOM)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/
const RANGE = /^\((\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})\)$/

export type SigaaSchedule = {
  slots: TimeSlot[]
  validFrom: string | null
  validTo: string | null
}

// Lê a célula "Horários" do SIGAA, uma linha por horário e a vigência entre
// parênteses ("SEG 08:00-10:00", "(10/08/2026 - 11/12/2026)"). Internatos
// têm vários blocos de datas: os horários entram sem repetição e a vigência
// vai do início do primeiro bloco ao fim do último (D70).
export function parseSigaaSchedule(text: string): SigaaSchedule {
  const slots: TimeSlot[] = []
  const seen = new Set<string>()
  let validFrom: string | null = null
  let validTo: string | null = null

  for (const line of text.split('\n').map((item) => item.trim())) {
    const slot = SLOT.exec(line)
    if (slot) {
      const [, day = '', startTime = '', endTime = ''] = slot
      const key = `${day} ${startTime} ${endTime}`
      if (seen.has(key)) continue
      seen.add(key)
      slots.push({ weekday: DAYS[day] as Weekday, startTime, endTime })
      continue
    }
    const range = RANGE.exec(line)
    if (range) {
      const [, d1, m1, y1, d2, m2, y2] = range
      const from = `${y1}-${m1}-${d1}`
      const to = `${y2}-${m2}-${d2}`
      if (validFrom === null || from < validFrom) validFrom = from
      if (validTo === null || to > validTo) validTo = to
    }
  }
  return { slots, validFrom, validTo }
}
