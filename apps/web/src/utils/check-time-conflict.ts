import type { ClassSection } from '@/types/class'
import { dayToColIndex } from './day-to-col'
import { timeToMinutes } from './time-to-minutes'

export const checkTimeConflict = (
  newClass: ClassSection,
  existingClasses: ClassSection[],
): ClassSection[] => {
  const conflicts: ClassSection[] = []

  for (const newSlot of newClass.schedule) {
    const newStart = timeToMinutes(newSlot.startTime)
    const newEnd = timeToMinutes(newSlot.endTime)
    const newDay = dayToColIndex(newSlot.day)

    for (const existingClass of existingClasses) {
      // Don't check against itself if updating
      if (existingClass.id === newClass.id) continue

      for (const existingSlot of existingClass.schedule) {
        const existingDay = dayToColIndex(existingSlot.day)

        if (newDay === existingDay) {
          const existingStart = timeToMinutes(existingSlot.startTime)
          const existingEnd = timeToMinutes(existingSlot.endTime)

          // Check overlap: StartA < EndB && StartB < EndA
          if (newStart < existingEnd && existingStart < newEnd) {
            // Check if we haven't already marked this class as conflicting
            if (!conflicts.find((c) => c.id === existingClass.id)) {
              conflicts.push(existingClass)
            }
          }
        }
      }
    }
  }

  return conflicts
}
