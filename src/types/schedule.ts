import type { ScheduledClass } from './class'

export type Schedule = {
  id: string
  courseId: string
  name: string
  createdAt: number
  updatedAt: number
  classes: ScheduledClass[]
}
