'use client'

import { FilterCheckbox } from '@/components/filter-checkbox'
import { Glow } from '@/components/glow'
import { useSchedule } from '@/contexts/schedule'
import { getGlowColor } from '@/utils/get-glow-color'
import { cn } from '@/lib/utils'
import type { Subject } from '@/types/course'
import { capitalizeWords } from '@/utils/capitalize-words'
import { checkPrerequisites } from '@/utils/check-prerequesites'
import { getSubjectStyle } from '@/utils/get-subject-style'
import { AlertCircle, CalendarIcon, TrashIcon } from 'lucide-react'
import { SelectedSubjectDialog } from '../selected-subject-dialog'
import { useClass } from '@/contexts/class'
import { useCourse } from '@/contexts/course'
import { cva } from 'class-variance-authority'
import * as React from 'react'

export const cardContainerVariants = cva('', {
  variants: {
    color: {
      red: 'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/90 dark:hover:bg-red-900 dark:border-red-700 dark:text-red-300',
      orange:
        'bg-amber-100 border-amber-200 text-amber-800 dark:bg-amber-900/90 dark:hover:bg-amber-900 dark:border-amber-700 dark:text-amber-300',
      lime: 'bg-lime-100 border-lime-200 text-lime-800 dark:bg-lime-900/90 dark:hover:bg-lime-900 dark:border-lime-700 dark:text-lime-300',
      green:
        'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/90 dark:hover:bg-green-900 dark:border-green-700 dark:text-green-300',
      emerald:
        'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/90 dark:hover:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-300',
      teal: 'bg-teal-100 border-teal-200 text-teal-800 dark:bg-teal-900/90 dark:hover:bg-teal-900 dark:border-teal-700 dark:text-teal-300',
      cyan: 'bg-cyan-100 border-cyan-200 text-cyan-800 dark:bg-cyan-900/90 dark:hover:bg-cyan-900 dark:border-cyan-700 dark:text-cyan-300',
      blue: 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/90 dark:hover:bg-blue-900 dark:border-blue-700 dark:text-blue-300',
      violet:
        'bg-violet-100 border-violet-200 text-violet-800 dark:bg-violet-900/90 dark:hover:bg-violet-900 dark:border-violet-700 dark:text-violet-300',
      fuschia:
        'bg-fuchsia-100 border-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-900/90 dark:hover:bg-fuchsia-900 dark:border-fuchsia-700 dark:text-fuchsia-300',
      pink: 'bg-pink-100 border-pink-200 text-pink-800 dark:bg-pink-900/90 dark:hover:bg-pink-900 dark:border-pink-700 dark:text-pink-300',
      rose: 'bg-rose-100 border-rose-200 text-rose-800 dark:bg-rose-900/90 dark:hover:bg-rose-900 dark:border-rose-700 dark:text-rose-300',
    },
  },
  defaultVariants: { color: 'blue' },
})

interface SubjectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  index: number
  subject: Subject
  colors: string[]
}

export function SubjectItem({
  subject,
  colors,
  index,
  ...props
}: SubjectItemProps) {
  const {
    completedSubjects,
    toggleCompletedSubject,
    scheduleClasses,
    removeClassFromSchedule,
  } = useSchedule()
  const {
    getSubjectInformationByCode,
    currentYear,
    currentSemester,
    isClassLoading,
    currentClassGroup,
  } = useClass()
  const { selectedCurriculum } = useCourse()

  const subjectColor = getSubjectStyle(colors, subject.nature, 180)

  const glowColor = getGlowColor(subject?.nature, colors)

  const allSubjects = selectedCurriculum?.subjects || []
  const missingPreRequisites = checkPrerequisites(
    subject,
    completedSubjects,
    allSubjects,
  )

  const isCompleted = completedSubjects.includes(subject.code)
  const isLocked = missingPreRequisites.length > 0
  const scheduledClass = scheduleClasses.find(
    (scheduled) => scheduled.code === subject.code,
  )

  const isDataStale =
    isClassLoading ||
    !currentClassGroup ||
    currentClassGroup.year !== currentYear ||
    currentClassGroup.semester !== currentSemester

  const scheduleInfo =
    !isDataStale && subject?.code
      ? getSubjectInformationByCode(subject.code)
      : null

  const hasClasses = scheduleInfo?.classes && scheduleInfo.classes.length > 0

  const isScheduled = scheduleClasses.some(
    (scheduledClass) => scheduledClass.code === subject.code,
  )

  const globalFirstSubject = index === 0

  const cardId = globalFirstSubject ? 'tour-subject-card' : undefined
  const checkId = globalFirstSubject ? 'tour-subject-check' : undefined

  return (
    <div
      {...props}
      id={cardId}
      className={cn(
        'bg-accent/70 border-border/50 group hover:border-border text-foreground/90 hover:bg-accent/90 relative flex w-full cursor-pointer items-start justify-between gap-2 overflow-hidden rounded-md border px-3 py-3 transition-all duration-300 aria-disabled:opacity-80',
        isCompleted &&
          'border-emerald-300 bg-emerald-300/20 hover:border-emerald-400 hover:bg-emerald-300/30 dark:border-emerald-400/50 dark:bg-emerald-400/30 hover:dark:border-emerald-400 hover:dark:bg-emerald-400/40',
        isScheduled &&
          'border-blue-300 bg-blue-300/20 hover:border-blue-400 hover:bg-blue-300/30 dark:border-blue-400/50 dark:bg-blue-400/30 hover:dark:border-blue-400 hover:dark:bg-blue-400/40',
        isScheduled &&
          scheduledClass?.color &&
          cardContainerVariants({ color: scheduledClass.color }),
      )}
    >
      <Glow
        colors={glowColor}
        className="absolute -left-32 z-1 size-24 opacity-60 blur-xl transition-all duration-300 group-hover:-left-12"
      />
      <div
        style={{ background: subjectColor }}
        className="absolute top-0 left-0 z-10 h-full w-1"
      />
      <SelectedSubjectDialog
        subject={subject}
        scheduleInfo={scheduleInfo!}
        missingPreRequisites={missingPreRequisites}
      >
        <button
          className="flex h-full w-full flex-col items-start justify-between gap-1"
          type="button"
          disabled={!hasClasses || isScheduled || isCompleted}
        >
          <div className="relative z-10 flex items-center justify-start gap-2">
            <span className="text-foreground/90 font-mono text-xs">
              {subject.code}
            </span>
            <span className="text-foreground text-start text-sm">
              {capitalizeWords(subject.name)}
            </span>
          </div>
          {isLocked && (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="size-3" />
              <span className="text-xs">
                Falta: {missingPreRequisites.join(', ')}
              </span>
            </div>
          )}
          {!hasClasses && (
            <div className="mt-1 text-xs text-amber-600 italic">
              Sem horários cadastrados
            </div>
          )}
          {isScheduled && (
            <div className="flex w-full items-center gap-1 text-xs text-inherit">
              <CalendarIcon className="size-4" />
              <span>Agendado</span>
            </div>
          )}
        </button>
      </SelectedSubjectDialog>
      <div className="flex h-full flex-col items-center justify-between gap-2">
        <FilterCheckbox
          id={checkId}
          onCheckedChange={() => toggleCompletedSubject(subject.code)}
          checked={isCompleted}
        />
        {isScheduled && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              const cls = scheduleClasses.find((p) => p.code === subject.code)
              if (cls) removeClassFromSchedule(cls)
            }}
            className="ml-auto rounded-md bg-red-500/20 p-1 text-red-500 hover:underline"
          >
            <TrashIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
