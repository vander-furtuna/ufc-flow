import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { ClassSection, SubjectGroup } from '@/types/class'
import type { Subject } from '@/types/course'
import { capitalizeWords } from '@/utils/capitalize-words'
import { AlertCircle, AlertTriangle, Check, Plus, User } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { TimePill } from './time-pill'
import { useSchedule } from '@/contexts/schedule'
import { checkTimeConflict } from '@/utils/check-time-conflict'
import { cn } from '@/lib/utils'
import { useClass } from '@/contexts/class'

import { useCourse } from '@/contexts/course'

import { checkPrerequisites } from '@/utils/check-prerequesites'

type SelectedSubjectDialogProps = ComponentProps<typeof Dialog> & {
  subject: Subject
  scheduleInfo?: SubjectGroup
  missingPreRequisites?: string[]
}

export function SelectedSubjectDialog({
  children,
  subject,
  scheduleInfo: propScheduleInfo,
  missingPreRequisites: propMissingPreRequisites,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  ...props
}: SelectedSubjectDialogProps) {
  const { addClassToSchedule, scheduleClasses, completedSubjects } =
    useSchedule()
  const { selectedCurriculum } = useCourse()
  const {
    getSubjectInformationByCode,
    isClassLoading,
    currentClassGroup,
    currentYear,
    currentSemester,
  } = useClass()

  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = isControlled ? controlledOnOpenChange : setInternalOpen

  const missingPreRequisites =
    propMissingPreRequisites !== undefined
      ? propMissingPreRequisites
      : checkPrerequisites(
          subject,
          completedSubjects,
          selectedCurriculum?.subjects || [],
        )

  const isDataStale =
    isClassLoading ||
    !currentClassGroup ||
    currentClassGroup.year !== currentYear ||
    currentClassGroup.semester !== currentSemester

  const scheduleInfo = isDataStale
    ? null
    : getSubjectInformationByCode(subject.code) || propScheduleInfo

  const currentScheduledClass = scheduleClasses.find(
    (c) => c.code === subject.code,
  )
  const otherScheduleClasses = scheduleClasses.filter(
    (c) => c.code !== subject.code,
  )

  const handleAddClass = (classItem: ClassSection) => {
    addClassToSchedule(classItem)
    setIsOpen?.(false)
  }

  const hasNoClasses =
    !scheduleInfo?.classes || scheduleInfo.classes.length === 0

  return (
    <Dialog {...props} open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="z-800 p-0">
        <DialogHeader className="border-border border-b p-5">
          <DialogTitle className="font-clash text-xl">
            {capitalizeWords(subject.name)}
          </DialogTitle>
          <DialogDescription>{subject.code}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 px-3 pb-4 sm:px-5">
          {isDataStale ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
              <span className="text-muted-foreground text-sm font-medium">
                Carregando turmas...
              </span>
            </div>
          ) : (
            <>
              {missingPreRequisites.length > 0 && (
                <div className="flex w-full flex-col gap-1.5 rounded-md border border-amber-300 bg-amber-500/20 p-3 text-amber-800 dark:border-amber-400/50 dark:bg-amber-400/20 dark:text-amber-300">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>
                      {missingPreRequisites.length === 1
                        ? 'Pré-requisito pendente:'
                        : 'Pré-requisitos pendentes:'}
                    </span>
                  </div>
                  <ul className="ml-6 list-disc space-y-0.5 text-xs">
                    {missingPreRequisites.map((reqItem) => {
                      const codes = reqItem.split(' ou ')
                      const names = codes
                        .map((c) => {
                          const s = selectedCurriculum?.subjects.find(
                            (sub) => sub.code === c,
                          )
                          return s ? capitalizeWords(s.name) : null
                        })
                        .filter(Boolean)

                      const uniqueNames = Array.from(new Set(names))
                      const nameLabel =
                        uniqueNames.length > 0
                          ? ` - ${uniqueNames.join(' / ')}`
                          : ''

                      return (
                        <li key={reqItem}>
                          <span className="font-mono font-semibold">
                            {reqItem}
                          </span>
                          {nameLabel}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {hasNoClasses && (
                <div className="border-border/50 bg-accent/20 flex flex-col items-center justify-center gap-2 rounded-md border py-8 text-center">
                  <p className="text-muted-foreground text-sm font-medium">
                    Não há turmas disponíveis esse semestre
                  </p>
                </div>
              )}
              {scheduleInfo?.classes.map((classItem) => {
                const conflicts = checkTimeConflict(
                  classItem,
                  otherScheduleClasses,
                )
                const hasConflict = conflicts.length > 0
                const isCurrentClass =
                  classItem.sectionId === currentScheduledClass?.sectionId

                return (
                  <div
                    className={cn(
                      'bg-accent/30 border-border/50 flex flex-col gap-4 rounded-md border px-4 py-4 sm:flex-row',
                      isCurrentClass &&
                        'border-emerald-500/50 bg-emerald-500/10 dark:border-emerald-400/50 dark:bg-emerald-400/10',
                      hasConflict &&
                        !isCurrentClass &&
                        'border-red-300 bg-red-500/20 dark:border-red-400/50 dark:bg-red-400/20',
                    )}
                    key={classItem.sectionId}
                  >
                    <div className="flex w-full flex-col items-start gap-2">
                      <div className="flex w-fit flex-col items-start">
                        <div className="flex items-center gap-3">
                          <strong className="font-clash text-lg font-semibold">
                            Turma {classItem.sectionId}
                          </strong>
                          {isCurrentClass && (
                            <span className="flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300">
                              <Check className="size-3.5" /> Selecionada
                            </span>
                          )}
                          <span className="bg-accent/50 flex items-center gap-1 rounded-md px-2 py-1 text-sm">
                            <User className="size-4" />{' '}
                            {classItem.reservedSeats}
                          </span>
                        </div>
                        <div>
                          {classItem?.instructors?.map((instructor) => (
                            <p
                              key={instructor.siape}
                              className="text-foreground/90 text-sm"
                            >
                              {capitalizeWords(instructor.name)}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="flex w-full flex-wrap gap-1">
                        {classItem.schedule.map((time) => (
                          <TimePill time={time} key={time.id} />
                        ))}
                      </div>
                      {hasConflict && !isCurrentClass && (
                        <div className="flex items-center gap-2 text-xs text-red-600">
                          <AlertCircle className="size-4 shrink-0" />
                          <span>
                            Conflita com:{' '}
                            {conflicts
                              .map((c) => capitalizeWords(c.name))
                              .join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleAddClass(classItem)}
                      className={cn(
                        'self-end sm:self-auto',
                        isCurrentClass &&
                          'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600',
                        hasConflict &&
                          !isCurrentClass &&
                          'cursor-not-allowed bg-red-500 text-white opacity-80 dark:border-red-500 dark:bg-red-400/50',
                      )}
                      disabled={hasConflict || isCurrentClass}
                    >
                      {isCurrentClass ? (
                        <Check className="size-5" />
                      ) : hasConflict ? (
                        <AlertTriangle className="size-5" />
                      ) : (
                        <Plus className="size-5" />
                      )}
                    </Button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
