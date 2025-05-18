import { AnimatePresence } from 'motion/react'
import { useMemo } from 'react'

import { useCourse } from '@/app/contexts/course'
import { NoResultCard } from '@/components/no-result-card'
import { SemesterTitle } from '@/components/title'

import { SubjectCard } from './subject-card'

export function SubjectDiagram() {
  const { filteredSubjects } = useCourse()

  const semestersValues = useMemo(
    () => Array.from({ length: 10 }, (_, i) => i + 1),
    [],
  )

  return (
    <article className="flex w-full flex-col items-center justify-start gap-12">
      {filteredSubjects.length > 0 ? (
        semestersValues.map((period) => {
          if (filteredSubjects.some((course) => course.semester === period)) {
            return (
              <div key={period} className="flex w-full flex-col gap-4">
                <SemesterTitle>{period}º PERÍODO</SemesterTitle>
                <div className="grid w-full grid-flow-dense auto-rows-[100px] grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] justify-items-center gap-4">
                  <AnimatePresence>
                    {filteredSubjects
                      .filter((subject) => subject.semester === period)
                      .map((subject) => {
                        return (
                          <SubjectCard subject={subject} key={subject.code} />
                        )
                      })}
                  </AnimatePresence>
                </div>
              </div>
            )
          }
          return null
        })
      ) : (
        <div className="center size-full">
          <NoResultCard />
        </div>
      )}
    </article>
  )
}
