'use client'

import { useCourse } from '@/contexts/course'
import { useSchedule } from '@/contexts/schedule'
import { cn } from '@/lib/utils'
import type { ScheduledClassColor } from '@/types/class'
import { titleCase } from '@/utils/title-case'

// Ponto com a cor da turma na agenda (mesma paleta do calendário)
const DOT_COLORS: Record<ScheduledClassColor, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  fuchsia: 'bg-fuchsia-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
}

// "Na agenda · 5 disciplinas · 320 h" (mockup Agenda-Notificacoes): o que
// já está na agenda, com o aviso de turma alterada ou fora do SIGAA
export function ScheduleSummary({ className }: { className?: string }) {
  const { scheduleClasses } = useSchedule()
  const { selectedCurriculum } = useCourse()
  if (scheduleClasses.length === 0) return null

  const hours = scheduleClasses.reduce(
    (sum, cls) =>
      sum +
      (selectedCurriculum?.subjects.find((subject) => subject.code === cls.code)
        ?.duration ?? 0),
    0,
  )
  const count = scheduleClasses.length

  return (
    <section
      aria-labelledby="schedule-summary-title"
      className={cn('flex flex-col gap-2', className)}
    >
      <h2
        id="schedule-summary-title"
        className="font-clash text-base font-semibold uppercase"
      >
        Na agenda · {count} {count === 1 ? 'disciplina' : 'disciplinas'}
        {hours > 0 ? ` · ${hours} h` : ''}
      </h2>
      <ul className="flex flex-col gap-2">
        {scheduleClasses.map((cls) => {
          const flagged = cls.removed || cls.changed
          return (
            <li
              key={cls.id}
              className={cn(
                'flex items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-sm',
                flagged
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                  : 'bg-muted/50',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'size-2.5 shrink-0 rounded-full',
                  DOT_COLORS[cls.color],
                )}
              />
              <span className="min-w-0 flex-1 truncate">
                {titleCase(cls.name)}
              </span>
              {flagged ? (
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {cls.removed ? 'saiu' : 'mudou'}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  T{cls.sectionId}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
