'use client'

import { WarningIcon } from '@phosphor-icons/react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useSchedule } from '@/contexts/schedule'
import { cn } from '@/lib/utils'
import type { ScheduledClass } from '@/types/class'

const days = (cls: ScheduledClass) =>
  [...new Set(cls.schedule.map((slot) => slot.day))].join('/')

const hours = (cls: ScheduledClass) =>
  [...new Set(cls.schedule.map((slot) => slot.startTime))].join(', ')

// Turmas da agenda que o SIGAA mudou de horário ou deixou de ofertar
// (agenda na conta). A mudança se dispensa com "Ciente"; a turma removida
// sai da agenda.
export function ScheduleWarnings({ className }: { className?: string }) {
  const { scheduleClasses, acknowledgeChange, removeClassFromSchedule } =
    useSchedule()
  const flagged = scheduleClasses.filter((cls) => cls.removed || cls.changed)
  if (flagged.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {flagged.map((cls) => (
        <Alert key={cls.id} variant="warning" className="py-3">
          <WarningIcon weight="bold" className="size-4" aria-hidden />
          <AlertDescription className="flex flex-col gap-2 text-[13px] leading-snug">
            <p>
              <b>
                {cls.name} · turma {cls.sectionId}
              </b>{' '}
              {cls.removed
                ? 'não é mais ofertada no SIGAA.'
                : `mudou de horário no SIGAA: agora ${days(cls)} ${hours(cls)}.`}
            </p>
            <div className="flex gap-2">
              {cls.removed ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 bg-transparent"
                  onClick={() => removeClassFromSchedule(cls)}
                >
                  Tirar da agenda
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 bg-transparent"
                  onClick={() => acknowledgeChange(cls)}
                >
                  Ciente
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
