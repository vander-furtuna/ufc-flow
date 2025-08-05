'use client'
import { AnimatePresence } from 'motion/react'
import { useMemo } from 'react'

import { NoResultCard } from '@/components/no-result-card'
import { SemesterTitle } from '@/components/title'
import { useCourse } from '@/contexts/course'

import { SubjectCard } from './subject-card'
import { SubjectTypeSubtitle } from './subject-type-subtitle'

export function SubjectDiagram() {
  const { filteredSubjects } = useCourse()

  const semestersValues = useMemo(
    () => Array.from({ length: 10 }, (_, i) => i + 1),
    [],
  )

  return (
    <article className="flex w-full flex-col items-center justify-start gap-8">
      <div className="flex w-full flex-col items-start justify-start gap-2">
        <span className="font-clash font-medium">Tipo/Vertente:</span>
        <SubjectTypeSubtitle />
      </div>

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
                          <SubjectCard
                            subject={subject}
                            key={subject.code}
                            id={subject.slug}
                          />
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
