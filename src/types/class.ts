// --- Interfaces (em TS) ---
export interface ScheduleTime {
  id: string
  day: string
  startTime: string
  endTime: string
}

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}

export interface Instructor {
  name: string
  siape: string
  profileUrl: string
}

export interface ClassSection {
  id: string
  term: string
  sectionId: string
  instructors: Instructor[]
  reservedSeats: number
  schedule: ScheduleTime[]
  validity: DateRange
  code: string
  name: string
}

export interface SubjectGroup {
  code: string
  name: string
  classes: ClassSection[]
}

export type StorageClass = {
  year: number
  semester: number
  classGroup: SubjectGroup[]
}
