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
import { AlertCircle, User } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { TimePill } from './time-pill'
import { useSchedule } from '@/contexts/schedule'
import { checkTimeConflict } from '@/utils/check-time-conflict'
import { cn } from '@/lib/utils'

type SelectedSubjectDialogProps = ComponentProps<typeof Dialog> & {
  subject: Subject
  scheduleInfo: SubjectGroup
}

export function SelectedSubjectDialog({
  children,
  subject,
  scheduleInfo,
  ...props
}: SelectedSubjectDialogProps) {
  const { addClassToSchedule, scheduleClasses } = useSchedule()

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAddClass = (classItem: ClassSection) => {
    addClassToSchedule(classItem)
    setIsDialogOpen(false)
  }

  return (
    <Dialog {...props} open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="border-border border-b p-5">
          <DialogTitle className="font-clash text-xl">
            {capitalizeWords(subject.name)}
          </DialogTitle>
          <DialogDescription>{subject.code}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 px-5 pb-4">
          {scheduleInfo?.classes.map((classItem) => {
            const conflicts = checkTimeConflict(classItem, scheduleClasses)
            const hasConflict = conflicts.length > 0
            return (
              <div
                className={cn(
                  'bg-accent/30 border-border/50 flex flex-col gap-4 rounded-md border px-4 py-4',
                  hasConflict &&
                    'border-red-300 bg-red-500/20 dark:border-red-400/50 dark:bg-red-400/20',
                )}
                key={classItem.sectionId}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex w-fit flex-col items-start">
                    <div className="flex">
                      <strong className="font-clash text-lg font-semibold">
                        Turma {classItem.sectionId}
                      </strong>
                      <span className="bg-accent/50 ml-4 flex items-center gap-1 rounded-md px-2 py-1 text-sm">
                        <User className="size-4" /> {classItem.reservedSeats}
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
                  <Button
                    size="sm"
                    onClick={() => handleAddClass(classItem)}
                    className={cn(
                      hasConflict &&
                        'cursor-not-allowed bg-red-500 text-white opacity-80 dark:bg-red-400/50',
                    )}
                    disabled={hasConflict}
                  >
                    {hasConflict ? 'Conflito' : 'Adicionar'}
                  </Button>
                </div>
                <div className="flex gap-1">
                  {classItem.schedule.map((time) => (
                    <TimePill time={time} key={time.id} />
                  ))}
                </div>
                {hasConflict && (
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>
                      Conflita com:{' '}
                      {conflicts.map((c) => capitalizeWords(c.name)).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
