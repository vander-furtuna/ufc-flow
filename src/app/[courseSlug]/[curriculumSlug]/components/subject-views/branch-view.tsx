import { useCourse } from '@/contexts/course'
import { SubjectViewBase } from './subject-view-base'

export function BranchView() {
  const { selectedCurriculum } = useCourse()

  return (
    <>
      <SubjectViewBase
        title="OBRIGATÓRIAS"
        subjects={selectedCurriculum?.subjects
          .filter((subject) => subject.nature === 'OBRIGATÓRIA')
          .sort((a, b) => a.semester - b.semester)}
      />

      {selectedCurriculum?.branchs.map((branch) => {
        return (
          <SubjectViewBase
            key={branch.id}
            title={branch.name}
            subjects={selectedCurriculum?.subjects
              .filter((subject) => subject.branch.includes(branch.id))
              .sort((a, b) => a.semester - b.semester)}
          />
        )
      })}
    </>
  )
}
