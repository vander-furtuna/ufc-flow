import type { Subject } from '@/types/course'
import { SemesterTitle } from '@/components/title'
import { AnimatePresence } from 'motion/react'
import { useClass } from '@/contexts/class'
import { SubjectCard } from '../subject-card'
import { cn } from '@/lib/utils'
import { useTools } from '@/contexts/tools'
import { useMemo } from 'react'

type SubjectViewBaseProps = {
  subjects?: Subject[]
  title: string
} & React.HTMLAttributes<HTMLDivElement>

export function SubjectViewBase({
  subjects,
  title,
  className,
  ...props
}: SubjectViewBaseProps) {
  const { availability, highlightUnavailable } = useTools()
  const { currentClassGroup } = useClass()

  const mappedSubjects = useMemo(() => {
    return subjects
      ?.map((subject) => {
        const subjectClass = currentClassGroup?.classGroup?.find(
          (s) => s.code === subject.code,
        )

        if (availability === 'available' && !subjectClass) {
          if (!subjectClass && !(subject.type !== 'DISCIPLINA')) {
            return null
          }
        }

        if (availability === 'unavailable') {
          if (subjectClass || subject.type !== 'DISCIPLINA') {
            return null
          }
        }

        const isUnavailable =
          currentClassGroup && !subjectClass && subject.type === 'DISCIPLINA'

        return {
          ...subject,
          isActive: !isUnavailable || !highlightUnavailable,
        }
      })
      .filter((subject) => subject !== null)
  }, [subjects, availability, currentClassGroup, highlightUnavailable])

  return mappedSubjects && mappedSubjects.length > 0 ? (
    <div className={cn('flex w-full flex-col gap-4', className)} {...props}>
      <SemesterTitle className="uppercase">{title}</SemesterTitle>
      <div className="grid w-full grid-flow-dense auto-rows-[100px] grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] justify-items-center gap-4">
        <AnimatePresence>
          {mappedSubjects.map((subject, index) => {
            if (!subject) {
              return null
            }

            return (
              <SubjectCard
                childIndex={index}
                subject={subject}
                key={subject.code}
                id={subject.slug}
                isActive={subject.isActive}
              />
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  ) : null
}
