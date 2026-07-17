'use client'

import { SubjectItem } from './subject-item'
import { useCourse } from '@/contexts/course'
import { useTools } from '@/contexts/tools'
import { useClass } from '@/contexts/class'
import { NATURE_CONFIG } from '@/data/colors'
import type { Subject } from '@/types/course'
import { Line } from '@/components/title'
import { useMemo } from 'react'
import { VisualSettings } from './visual-settings'

type SubjectGroup = {
  key: string
  title: string
  subjects: (Subject & { isActive: boolean })[]
}

export function SubjectsList({ showLine = true }: { showLine?: boolean }) {
  const { filteredSubjects, selectedCurriculum } = useCourse()
  const { groupBy, availability, highlightUnavailable } = useTools()
  const { currentClassGroup } = useClass()

  const mappedSubjects = useMemo(() => {
    return filteredSubjects
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
      .filter((subject) => subject !== null) as (Subject & {
      isActive: boolean
    })[]
  }, [filteredSubjects, availability, currentClassGroup, highlightUnavailable])

  const groups = useMemo(() => {
    if (!mappedSubjects) return []

    if (groupBy === 'semester') {
      const semestersValues = Array.from({ length: 10 }, (_, i) => i + 1)
      return semestersValues
        .map((period) => {
          const subjectsInPeriod = mappedSubjects.filter(
            (subject) => subject.semester === period,
          )
          if (subjectsInPeriod.length === 0) return null
          return {
            key: `semester-${period}`,
            title: `${period}º Período`,
            subjects: subjectsInPeriod,
          }
        })
        .filter((g) => g !== null) as SubjectGroup[]
    }

    if (groupBy === 'branch') {
      if (!selectedCurriculum) return []
      const presentNatures = new Set(
        selectedCurriculum.subjects.map((s) => s.nature) || [],
      )
      const activeNatures = NATURE_CONFIG.filter((n) =>
        presentNatures.has(n.value),
      )

      const natureGroups = activeNatures
        .map((nature) => {
          const subjectsInNature = mappedSubjects
            .filter((subject) => subject.nature === nature.value)
            .sort((a, b) => a.semester - b.semester)
          if (subjectsInNature.length === 0) return null
          return {
            key: `nature-${nature.value}`,
            title: nature.label.toUpperCase(),
            subjects: subjectsInNature,
          }
        })
        .filter((g) => g !== null) as SubjectGroup[]

      const branchGroups = (selectedCurriculum.branchs || [])
        .map((branch) => {
          const subjectsInBranch = mappedSubjects
            .filter((subject) => subject.branch.includes(branch.id))
            .sort((a, b) => a.semester - b.semester)
          if (subjectsInBranch.length === 0) return null
          return {
            key: `branch-${branch.id}`,
            title: branch.name,
            subjects: subjectsInBranch,
          }
        })
        .filter((g) => g !== null) as SubjectGroup[]

      return [...natureGroups, ...branchGroups]
    }

    if (groupBy === 'duration') {
      const durations = [32, 48, 64, 160]
      return durations
        .map((duration) => {
          const subjectsInDuration = mappedSubjects.filter(
            (subject) => subject.duration === duration,
          )
          if (subjectsInDuration.length === 0) return null
          return {
            key: `duration-${duration}`,
            title: `${duration} Horas`,
            subjects: subjectsInDuration,
          }
        })
        .filter((g) => g !== null) as SubjectGroup[]
    }

    return []
  }, [mappedSubjects, groupBy, selectedCurriculum])

  return (
    <>
      <VisualSettings />

      {groups.map(({ key, title, subjects }) => (
        <div key={key} className="flex w-full flex-col gap-2">
          <div className="relative flex w-full items-center gap-3">
            <h3
              className={`text-foreground/85 font-clash text-xl font-semibold tracking-wider uppercase ${showLine ? 'flex-1 text-nowrap' : ''}`}
            >
              {title}
            </h3>
            {showLine && <Line />}
          </div>
          <div className="flex w-full flex-col gap-2">
            {subjects.map((subject, index) => {
              const colors = selectedCurriculum?.branchs
                .filter((currentBranch) =>
                  subject.branch.includes(currentBranch.id),
                )
                .map((branch) => branch.color)

              return (
                <SubjectItem
                  subject={subject}
                  key={subject.code}
                  colors={colors || []}
                  index={index}
                  isActive={subject.isActive}
                />
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
