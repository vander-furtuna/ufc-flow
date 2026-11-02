export type ScheduleTime = {
  id: string
  day: string
  startTime: string
  endTime: string
}

export type DateRange = {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}

export type Instructor = {
  name: string
  siape: string
  profileUrl: string
}

export type ClassSection = {
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

export type ScheduledClassColor =
  | 'red'
  | 'orange'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'violet'
  | 'fuchsia'
  | 'pink'
  | 'rose'

export type ScheduledClass = ClassSection & {
  color: ScheduledClassColor
  // Agenda na conta: horário ou docentes mudaram no SIGAA depois que a
  // turma entrou, ou a turma saiu do SIGAA
  changed?: boolean
  removed?: boolean
}

export type SubjectGroup = {
  code: string
  name: string
  classes: ClassSection[]
}

export type StorageClass = {
  year: number
  semester: number
  classGroup: SubjectGroup[]
  // De onde vieram as turmas: da coleta da API (ids estáveis) ou do SIGAA
  source?: 'api' | 'sigaa'
}
