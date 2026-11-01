// Dia da semana no padrão ISO 8601: 1 = segunda ... 7 = domingo
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

// Horário de uma turma. Horas em "HH:MM" ou "HH:MM:SS" (formato do Postgres)
export type TimeSlot = {
  weekday: Weekday
  startTime: string
  endTime: string
}

// Turma como item de agenda
export type ScheduleSection = {
  id: string
  subjectCode: string
  slots: readonly TimeSlot[]
}

export type ScheduleViolation =
  | {
      code: 'SCHEDULE_DUPLICATE_SUBJECT'
      subjectCode: string
      sectionIds: string[]
    }
  | { code: 'SCHEDULE_TIME_CONFLICT'; sectionIds: [string, string] }
