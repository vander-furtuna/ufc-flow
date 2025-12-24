'use client'

import { NoResultCard } from '@/components/no-result-card'

import { SubjectTypeSubtitle } from './subject-type-subtitle'
import { useCourse } from '@/contexts/course'
import { useTools } from '@/contexts/tools'
import { BranchView } from './subject-views/branch-view'
import { DurationView } from './subject-views/duration-view'
import { SemesterView } from './subject-views/semester-view'

export function SubjectDiagram() {
  const { filteredSubjects } = useCourse()
  const { groupBy } = useTools()

  return (
    <article className="flex w-full flex-col items-center justify-start gap-8">
      <div className="flex w-full flex-col items-start justify-start gap-2">
        <span className="font-clash font-medium">Tipo/Vertente:</span>
        <SubjectTypeSubtitle />
      </div>

      {filteredSubjects.length > 0 ? (
        <>
          {groupBy === 'semester' && <SemesterView />}
          {groupBy === 'branch' && <BranchView />}
          {groupBy === 'duration' && <DurationView />}
        </>
      ) : (
        <div className="center size-full">
          <NoResultCard />
        </div>
      )}
    </article>
  )
}
