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

export type SubjectGroup = {
  code: string
  name: string
  classes: ClassSection[]
}

export type StorageClass = {
  year: number
  semester: number
  classGroup: SubjectGroup[]
}
