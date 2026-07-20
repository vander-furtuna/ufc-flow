'use client'

import { SubjectItem } from './subject-item'
import { useCourse } from '@/contexts/course'
import { useTools } from '@/contexts/tools'
import { useClass } from '@/contexts/class'
import { useSchedule } from '@/contexts/schedule'
import { NATURE_CONFIG } from '@/data/colors'
import type { Subject } from '@/types/course'
import { Line } from '@/components/title'
import { Button } from '@/components/ui/button'
import { CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const { completedSubjects, toggleSubjectsCompleted } = useSchedule()

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

      {groups.map(({ key, title, subjects }) => {
        const subjectCodes = subjects.map((s) => s.code)
        const areAllCompleted =
          subjectCodes.length > 0 &&
          subjectCodes.every((code) => completedSubjects.includes(code))

        return (
          <div key={key} className="flex w-full flex-col gap-2">
            <div className="relative flex w-full items-center gap-3">
              <h3 className="text-foreground/85 font-clash text-xl font-semibold tracking-wider text-nowrap uppercase">
                {title}
              </h3>
              {showLine && (
                <div className="flex-1">
                  <Line />
                </div>
              )}
              {groupBy === 'semester' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSubjectsCompleted(subjectCodes)}
                  className={cn(
                    'h-7 shrink-0 gap-1.5 px-2 text-xs font-medium transition-colors',
                    areAllCompleted
                      ? 'text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title={
                    areAllCompleted
                      ? 'Desmarcar todas deste semestre'
                      : 'Marcar todas deste semestre como concluídas'
                  }
                >
                  <CheckCheck className="size-4" />
                  <span className="hidden sm:inline">
                    {areAllCompleted ? 'Concluído' : 'Concluir todas'}
                  </span>
                </Button>
              )}
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
        )
      })}
    </>
  )
}
