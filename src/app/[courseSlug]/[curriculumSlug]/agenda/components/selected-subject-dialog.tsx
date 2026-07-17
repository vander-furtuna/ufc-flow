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
import { AlertCircle, AlertTriangle, Plus, User } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { TimePill } from './time-pill'
import { useSchedule } from '@/contexts/schedule'
import { checkTimeConflict } from '@/utils/check-time-conflict'
import { cn } from '@/lib/utils'
import { useClass } from '@/contexts/class'

type SelectedSubjectDialogProps = ComponentProps<typeof Dialog> & {
  children?: React.ReactElement
  subject: Subject
  scheduleInfo?: SubjectGroup
  missingPreRequisites?: string[]
}

export function SelectedSubjectDialog({
  children,
  subject,
  scheduleInfo: propScheduleInfo,
  missingPreRequisites = [],
  ...props
}: SelectedSubjectDialogProps) {
  const { addClassToSchedule, scheduleClasses } = useSchedule()
  const {
    getSubjectInformationByCode,
    isClassLoading,
    currentClassGroup,
    currentYear,
    currentSemester,
  } = useClass()

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const isDataStale =
    isClassLoading ||
    !currentClassGroup ||
    currentClassGroup.year !== currentYear ||
    currentClassGroup.semester !== currentSemester

  const scheduleInfo = isDataStale
    ? null
    : getSubjectInformationByCode(subject.code) || propScheduleInfo

  const handleAddClass = (classItem: ClassSection) => {
    addClassToSchedule(classItem)
    setIsDialogOpen(false)
  }

  return (
    <Dialog {...props} open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="z-800 p-0">
        <DialogHeader className="border-border border-b p-5">
          <DialogTitle className="font-heading text-xl">
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
                <div className="flex w-full items-center gap-2 rounded-md border border-amber-300 bg-amber-500/20 px-4 py-3 text-amber-700 dark:border-amber-400/50 dark:bg-amber-400/20 dark:text-amber-300">
                  <AlertCircle className="size-5 shrink-0" />
                  <span className="text-sm">
                    Esta disciplina possui pré-requisitos não completos. Falta:{' '}
                    {missingPreRequisites.join(', ')}
                  </span>
                </div>
              )}
              {scheduleInfo?.classes.map((classItem) => {
                const conflicts = checkTimeConflict(classItem, scheduleClasses)
                const hasConflict = conflicts.length > 0
                return (
                  <div
                    className={cn(
                      'bg-accent/30 border-border/50 flex flex-col gap-4 rounded-md border px-4 py-4 sm:flex-row',
                      hasConflict &&
                        'border-red-300 bg-red-500/20 dark:border-red-400/50 dark:bg-red-400/20',
                    )}
                    key={classItem.sectionId}
                  >
                    <div className="flex w-full flex-col items-start gap-2">
                      <div className="flex w-fit flex-col items-start">
                        <div className="flex">
                          <strong className="font-heading text-lg font-semibold">
                            Turma {classItem.sectionId}
                          </strong>
                          <span className="bg-accent/50 ml-4 flex items-center gap-1 rounded-md px-2 py-1 text-sm">
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
                      {hasConflict && (
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
                        hasConflict &&
                          'cursor-not-allowed bg-red-500 text-white opacity-80 dark:border-red-500 dark:bg-red-400/50',
                      )}
                      disabled={hasConflict}
                    >
                      {hasConflict ? (
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
