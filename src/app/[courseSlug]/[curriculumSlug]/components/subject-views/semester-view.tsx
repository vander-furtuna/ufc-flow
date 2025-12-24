import { useCourse } from '@/contexts/course'
import { useMemo } from 'react'
import { SubjectViewBase } from './subject-view-base'

export function SemesterView() {
  const { filteredSubjects } = useCourse()

  const semestersValues = useMemo(
    () => Array.from({ length: 10 }, (_, i) => i + 1),
    [],
  )

  return semestersValues.map((period) => {
    if (filteredSubjects.some((course) => course.semester === period)) {
      return (
        <SubjectViewBase
          key={period}
          title={`${period}º PERÍODO`}
          subjects={filteredSubjects.filter(
            (subject) => subject.semester === period,
          )}
        />
      )
    }
    return null
  })
}
