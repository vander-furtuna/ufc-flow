'use client'

import { FilterCheckbox } from '@/components/filter-checkbox'
import { Glow } from '@/components/glow'
import { useCourse } from '@/contexts/course'
import { useSchedule } from '@/contexts/schedule'
import { COLORS } from '@/data/colors'
import { cn } from '@/lib/utils'
import type { Subject } from '@/types/course'
import { capitalizeWords } from '@/utils/capitalize-words'
import { checkPrerequisites } from '@/utils/check-prerequesites'
import { getSubjectStyle } from '@/utils/get-subject-style'
import { normalizeWords } from '@/utils/normalize-words'
import {
  AlertCircle,
  CalendarIcon,
  Download,
  Plus,
  Search,
  Trash2,
  TrashIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { SelectedSubjectDialog } from './selected-subject-dialog'
import { useClass } from '@/contexts/class'
import { cva } from 'class-variance-authority'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateScheduleDialog } from './create-schedule-dialog'
import { DestructiveDialog } from '@/components/dialogs/destructive-dialog'

const cardContainerVariants = cva('', {
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

function SubjectItem({
  subject,
  colors,
  index,
  ...props
}: {
  index: number
  subject: Subject
  colors: string[]
} & React.HTMLAttributes<HTMLDivElement>) {
  const {
    completedSubjects,
    toggleCompletedSubject,
    scheduleClasses,
    removeClassFromSchedule,
  } = useSchedule()
  const { getSubjectInformationByCode } = useClass()

  const subjectColor = getSubjectStyle(colors, subject.nature, 180)

  const glowColor =
    subject?.nature === 'OBRIGATÓRIA'
      ? COLORS.COMPULSORY
      : subject?.nature === 'OPTATIVA'
        ? colors && colors.length > 0
          ? colors
          : COLORS.OPTIONAL
        : ''

  const missingPreRequisites = checkPrerequisites(subject, completedSubjects)

  const isCompleted = completedSubjects.includes(subject.code)
  const isLocked = missingPreRequisites.length > 0
  const scheduledClass = scheduleClasses.find(
    (scheduled) => scheduled.code === subject.code,
  )
  const scheduleInfo = subject?.code
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
          disabled={!isCompleted && isLocked}
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

export function SubjectsSidebar({
  onDownloadSchedule,
}: {
  onDownloadSchedule?: () => void
}) {
  const [searchFilter, setSearchFilter] = useState('')

  const { currentSchedule, schedules, selectSchedule, deleteSchedule } =
    useSchedule()
  const { selectedCurriculum, selectedCourse } = useCourse()

  const subjectsBySemester = useMemo(() => {
    const grouped: Record<number, Subject[]> = {}

    const normalizedQueryLower = normalizeWords(searchFilter.toLowerCase())

    const subjects = selectedCurriculum?.subjects.filter((subject) => {
      const normalizedName = normalizeWords(subject.name.toLowerCase())
      const normalizedCode = normalizeWords(subject.code.toLowerCase())

      return (
        normalizedName.includes(normalizedQueryLower) ||
        normalizedCode.includes(normalizedQueryLower)
      )
    })

    subjects?.forEach((sub) => {
      if (!grouped[sub.semester]) grouped[sub.semester] = []
      grouped[sub.semester].push(sub)
    })
    return grouped
  }, [selectedCurriculum, searchFilter])

  return (
    <aside
      className="bg-accent/30 border-border/50 calendar-scrollbar flex min-h-0 flex-1 shrink-0 flex-col overflow-y-auto rounded-lg border md:overflow-y-hidden"
      id="tour-subject-list"
    >
      <div className="border-border/50 flex w-full flex-col gap-3 border-b p-3 sm:p-4">
        <h2 className="text-foreground/90 font-clash text-2xl font-semibold tracking-wider">
          {selectedCourse?.name}
        </h2>
        <div className="flex w-full flex-col gap-2">
          {currentSchedule && schedules.length > 0 && (
            <div
              className="bg-accent/80 border-border/70 hover:bg-accent/90 flex h-10 w-full items-center rounded-lg border p-0 px-2 transition-colors"
              id="tour-agenda-controls"
            >
              <div className="relative w-full">
                <Select
                  value={currentSchedule?.id || ''}
                  onValueChange={(value) =>
                    selectSchedule(schedules.find((s) => s.id === value)!)
                  }
                >
                  <SelectTrigger className="ring-none w-full border-0 bg-transparent px-1 py-2 text-xs outline-none focus:ring-0">
                    <SelectValue placeholder="Agenda" className="text-xs" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-foreground/20 mx-1 h-4 w-px"></div>

              <CreateScheduleDialog>
                <button className="hover:bg-foreground/10 text-foreground/90 rounded-md p-1.5 transition-all">
                  <Plus className="size-4" />
                </button>
              </CreateScheduleDialog>
              <DestructiveDialog
                title="Excluir Agenda"
                description="Tem certeza que deseja excluir agenda? Essa ação é IRREVERSÍVEL!"
                confirmButtonText="Excluir"
                onConfirm={() => deleteSchedule(currentSchedule!.id)}
              >
                <button
                  type="button"
                  id="tour-agenda-delete"
                  className="text-foreground/90 rounded-md p-1.5 transition-all hover:bg-red-600/10 hover:text-red-500 focus:bg-red-600/10 active:bg-red-600/20"
                >
                  <Trash2 className="size-4" />
                </button>
              </DestructiveDialog>
              <button
                className="text-foreground/90 rounded-md p-1.5 transition-all hover:bg-purple-600/10 hover:text-purple-500 focus:bg-purple-600/10 active:bg-purple-600/20"
                onClick={() => onDownloadSchedule?.()}
                id="tour-agenda-download"
              >
                <Download className="size-4" />
              </button>
            </div>
          )}

          <div className="bg-accent/80 border-border/50 hover:bg-accent/90 flex h-10 w-full items-center rounded-full border px-4">
            <input
              type="text"
              className="h-full w-full bg-transparent text-sm outline-none"
              placeholder="Pesquisar por nome ou código..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />

            <Search className="text-foreground/70 size-5" />
          </div>
        </div>
      </div>
      <div className="no-scrollbar flex h-full flex-col gap-4 p-4 md:overflow-y-auto">
        {(Object.entries(subjectsBySemester) as [string, Subject[]][]).map(
          ([sem, subjects]) => (
            <div key={sem} className="flex w-full flex-col gap-2">
              <h3 className="text-foreground/85 font-clash text-lg font-semibold tracking-wider uppercase">
                {sem}º Período
              </h3>
              <div className="flex w-full flex-col gap-1.5">
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
                    />
                  )
                })}
              </div>
            </div>
          ),
        )}
      </div>
    </aside>
  )
}
