import { AnimatePresence } from 'framer-motion'
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
    <section className="flex flex-col items-center justify-start gap-12 w-full">
      {filteredSubjects.length > 0 ? (
        semestersValues.map((period) => {
          if (filteredSubjects.some((course) => course.semester === period)) {
            return (
              <div key={period} className="flex gap-4 flex-col w-full">
                <SemesterTitle>{period}º PERÍODO</SemesterTitle>
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(9rem,_1fr))] auto-rows-[100px] justify-items-center grid-flow-dense gap-4 w-full">
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
        <div className="size-full center">
          <NoResultCard />
        </div>
      )}
    </section>
  )
}
