import type { ScheduledClass } from './class'

export type Schedule = {
  id: string
  courseId: string
  year: number
  semester: number
  name: string
  createdAt: number
  updatedAt: number
  classes: ScheduledClass[]
}
