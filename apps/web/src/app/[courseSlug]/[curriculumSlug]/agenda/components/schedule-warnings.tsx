'use client'

import { CaretRightIcon, WarningIcon } from '@phosphor-icons/react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useSchedule } from '@/contexts/schedule'
import { cn } from '@/lib/utils'
import type { ScheduledClass } from '@/types/class'
import { titleCase } from '@/utils/title-case'

const days = (cls: ScheduledClass) =>
  [...new Set(cls.schedule.map((slot) => slot.day))].join('/')

const hours = (cls: ScheduledClass) =>
  [...new Set(cls.schedule.map((slot) => slot.startTime))].join(', ')

// "16:00" vira "16h"; "13:30" fica "13h30"
const shortHour = (time: string) => {
  const [hour, minute] = time.split(':')
  return `${Number(hour)}h${minute && minute !== '00' ? minute : ''}`
}

// Aviso curto do celular: a primeira turma e quantas mais há; toca para abrir
// a lista com os avisos completos (mockup Mobile-Agenda)
function CompactWarning({
  flagged,
  onOpen,
  className,
}: {
  flagged: ScheduledClass[]
  onOpen?: () => void
  className?: string
}) {
  const first = flagged[0]!
  const others = flagged.length - 1
  const when = `${days(first)} ${[...new Set(first.schedule.map((slot) => shortHour(slot.startTime)))].join(', ')}`
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-left text-[13px] leading-snug text-amber-950 shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-amber-500/30 dark:bg-amber-950 dark:text-amber-100',
        className,
      )}
    >
      <WarningIcon
        weight="bold"
        className="size-4.5 shrink-0 text-amber-700 dark:text-amber-300"
        aria-hidden
      />
      <span className="flex-1">
        <b className="font-semibold">{titleCase(first.name)}</b>{' '}
        {first.removed ? 'saiu do SIGAA.' : `mudou para ${when} no SIGAA.`}
        {others > 0 &&
          ` E mais ${others} ${others === 1 ? 'aviso' : 'avisos'}.`}
      </span>
      <CaretRightIcon weight="bold" className="size-4 shrink-0" aria-hidden />
    </button>
  )
}

// Turmas da agenda que o SIGAA mudou de horário ou deixou de ofertar
// (agenda na conta). A mudança se dispensa com "Ciente"; a turma removida
// sai da agenda.
export function ScheduleWarnings({
  className,
  compact = false,
  onOpen,
}: {
  className?: string
  compact?: boolean
  onOpen?: () => void
}) {
  const { scheduleClasses, acknowledgeChange, removeClassFromSchedule } =
    useSchedule()
  const flagged = scheduleClasses.filter((cls) => cls.removed || cls.changed)
  if (flagged.length === 0) return null

  if (compact) {
    return (
      <CompactWarning flagged={flagged} onOpen={onOpen} className={className} />
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {flagged.map((cls) => (
        <Alert key={cls.id} variant="warning" className="rounded-[14px] py-3">
          <WarningIcon weight="bold" className="size-4" aria-hidden />
          <AlertDescription className="flex flex-col gap-2 text-[13px] leading-snug">
            <p>
              <b className="font-semibold">
                {titleCase(cls.name)} · turma {cls.sectionId}
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
