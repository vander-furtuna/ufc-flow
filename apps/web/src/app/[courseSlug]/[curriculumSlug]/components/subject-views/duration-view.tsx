import { useCourse } from '@/contexts/course'
import { SubjectViewBase } from './subject-view-base'

const durations = [32, 48, 64, 160]

export function DurationView() {
  const { filteredSubjects } = useCourse()

  return durations.map((duration) => {
    if (filteredSubjects.some((course) => course.duration === duration)) {
      return (
        <SubjectViewBase
          key={duration}
          title={`${duration} HORAS`}
          subjects={filteredSubjects.filter(
            (subject) => subject.duration === duration,
          )}
        />
      )
    }
    return null
  })
}
