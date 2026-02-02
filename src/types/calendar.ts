// --- Tipos ---
export type AcademicEvent = {
  id: string
  date: string // ISO String
  originalDateString: string // Ex: "28 a 30 (EAD)"
  description: string
  isRange: boolean
  isRangeStart?: boolean
  rangeId?: string
  category?: string // Opcional: para identificar PG ou EAD
  isImportant?: boolean
}

export type MonthGroup = {
  monthName: string
  year: number
  events: AcademicEvent[]
}
