import { useCourse } from '@/contexts/course'
import { NATURE_CONFIG } from '@/data/colors'
import { useMemo } from 'react'
import { SubjectViewBase } from './subject-view-base'

export function BranchView() {
  const { selectedCurriculum } = useCourse()

  // Show sections for all natures present in the curriculum
  const activeNatures = useMemo(() => {
    if (!selectedCurriculum) return []
    const presentNatures = new Set(
      selectedCurriculum.subjects.map((s) => s.nature),
    )
    return NATURE_CONFIG.filter((n) => presentNatures.has(n.value))
  }, [selectedCurriculum])

  return (
    <>
      {activeNatures.map((nature) => (
        <SubjectViewBase
          key={nature.value}
          title={nature.label.toUpperCase()}
          subjects={selectedCurriculum?.subjects
            .filter((subject) => subject.nature === nature.value)
            .sort((a, b) => a.semester - b.semester)}
        />
      ))}

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
