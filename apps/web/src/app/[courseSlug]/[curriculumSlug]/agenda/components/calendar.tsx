'use client'

import { useSchedule } from '@/contexts/schedule'
import { useClass } from '@/contexts/class'
import { useCourse } from '@/contexts/course'
import { useMediaQuery } from '@/hooks/use-media-query'
import { dayToColIndex } from '@/utils/day-to-col'
import { timeToMinutes } from '@/utils/time-to-minutes'
import { cva } from 'class-variance-authority'
import {
  ArrowsLeftRightIcon,
  ClockIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useState, type ComponentProps } from 'react'
import { Fragment } from 'react/jsx-runtime'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SelectedSubjectDialog } from './selected-subject-dialog'
import type { Subject } from '@/types/course'
import { cn } from '@/lib/utils'
import { titleCase } from '@/utils/title-case'

// Medidas do mockup Agenda-Notificacoes
const ROW_HEIGHT = 56
const HEADER_HEIGHT = 44
const startHour = 7
const endHour = 22

const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
const shortDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

const hourSlots = Array.from(
  { length: endHour - startHour + 1 },
  (_, i) => i + startHour,
)

// Fundo -100 e texto -900, como no mockup
const cardContainerVariants = cva(
  'pointer-events-auto absolute right-0.5 left-0.5 z-10 flex cursor-pointer flex-col gap-0.5 overflow-hidden rounded-[10px] p-1.5 text-[11px] leading-[1.3] transition-colors md:right-1.5 md:left-1.5 md:rounded-xl md:p-2.5 md:text-xs',
  {
    variants: {
      color: {
        red: 'bg-red-100 text-red-900 hover:bg-red-200/70 dark:bg-red-500/20 dark:text-red-100 dark:hover:bg-red-500/30',
        orange:
          'bg-orange-100 text-orange-900 hover:bg-orange-200/70 dark:bg-orange-500/20 dark:text-orange-100 dark:hover:bg-orange-500/30',
        lime: 'bg-lime-100 text-lime-900 hover:bg-lime-200/70 dark:bg-lime-500/20 dark:text-lime-100 dark:hover:bg-lime-500/30',
        green:
          'bg-green-100 text-green-900 hover:bg-green-200/70 dark:bg-green-500/20 dark:text-green-100 dark:hover:bg-green-500/30',
        emerald:
          'bg-emerald-100 text-emerald-900 hover:bg-emerald-200/70 dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/30',
        teal: 'bg-teal-100 text-teal-900 hover:bg-teal-200/70 dark:bg-teal-500/20 dark:text-teal-100 dark:hover:bg-teal-500/30',
        cyan: 'bg-cyan-100 text-cyan-900 hover:bg-cyan-200/70 dark:bg-cyan-500/20 dark:text-cyan-100 dark:hover:bg-cyan-500/30',
        blue: 'bg-blue-100 text-blue-900 hover:bg-blue-200/70 dark:bg-blue-500/20 dark:text-blue-100 dark:hover:bg-blue-500/30',
        violet:
          'bg-violet-100 text-violet-900 hover:bg-violet-200/70 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30',
        fuchsia:
          'bg-fuchsia-100 text-fuchsia-900 hover:bg-fuchsia-200/70 dark:bg-fuchsia-500/20 dark:text-fuchsia-100 dark:hover:bg-fuchsia-500/30',
        pink: 'bg-pink-100 text-pink-900 hover:bg-pink-200/70 dark:bg-pink-500/20 dark:text-pink-100 dark:hover:bg-pink-500/30',
        rose: 'bg-rose-100 text-rose-900 hover:bg-rose-200/70 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30',
      },
    },
    defaultVariants: { color: 'blue' },
  },
)

// Blocos estreitos do celular: palavras longas abreviadas, como no mockup
// Mobile-Agenda ("Sistemas Operac.", "Intelig. Computac.")
const abbreviate = (name: string) =>
  titleCase(name)
    .split(' ')
    .map((word) => (word.length > 9 ? `${word.slice(0, 7)}.` : word))
    .join(' ')

// "08:00" vira "8"; "13:30" fica igual (blocos estreitos do celular)
const compactHour = (time: string) =>
  time.endsWith(':00') ? String(Number(time.slice(0, 2))) : time

const slotLabel = (start: string, end: string, isMobile: boolean) =>
  isMobile
    ? start.endsWith(':00') && end.endsWith(':00')
      ? `${compactHour(start)}–${compactHour(end)}h`
      : start
    : `${start}–${end}`

type CalendarProps = ComponentProps<'div'>

export function Calendar({ ref, ...props }: CalendarProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { scheduleClasses, removeClassFromSchedule } = useSchedule()
  const { getSubjectInformationByCode } = useClass()
  const { selectedCurriculum } = useCourse()

  const [exchangeSubject, setExchangeSubject] = useState<Subject | null>(null)
  const [isExchangeOpen, setIsExchangeOpen] = useState(false)
  const [activeDropdownKey, setActiveDropdownKey] = useState<string | null>(
    null,
  )

  return (
    <section
      aria-label="Semana"
      className="flex h-full flex-col overflow-hidden rounded-b-md border bg-background md:rounded-3xl"
      id="tour-calendar"
    >
      <div
        {...props}
        className="relative grid calendar-scrollbar flex-1 overflow-auto bg-background"
        ref={ref as React.RefObject<HTMLDivElement>}
        style={{
          gridTemplateColumns: `${isMobile ? '36px' : '60px'} repeat(5, minmax(${isMobile ? 60 : 160}px, 1fr))`,
          gridTemplateRows: `${HEADER_HEIGHT}px repeat(${hourSlots.length}, ${ROW_HEIGHT}px)`,
        }}
      >
        <div className="sticky top-0 left-0 z-40 flex h-full items-center justify-center border-r border-b bg-muted/80 backdrop-blur-lg">
          <ClockIcon weight="bold" className="size-5 text-gray-400" />
        </div>

        {(isMobile ? shortDays : days).map((d, i) => (
          <div
            key={d}
            className="sticky top-0 z-30 flex items-center justify-center border-r border-b bg-muted/80 backdrop-blur-lg last:border-r-0"
            style={{ gridRow: 1, gridColumn: i + 2 }}
          >
            <span className="text-xs font-semibold tracking-[0.06em] text-foreground/90 uppercase">
              {d}
            </span>
          </div>
        ))}

        {hourSlots.map((h, rowIdx) => (
          <Fragment key={h}>
            <div
              className="sticky left-0 z-30 border-r border-b border-border/60 bg-muted/80 p-1.5 text-right text-xs text-muted-foreground backdrop-blur-[2px] md:pr-2.5"
              style={{ gridRow: rowIdx + 2, gridColumn: 1 }}
            >
              {isMobile ? `${h}h` : `${h}:00`}
            </div>
            {days.map((_, colIdx) => (
              <div
                key={`cell-${rowIdx}-${colIdx}`}
                className="border-r border-b border-border/60 bg-background last:border-r-0"
                style={{ gridRow: rowIdx + 2, gridColumn: colIdx + 2 }}
              />
            ))}
          </Fragment>
        ))}

        {days.map((_, colIdx) => {
          const dayEvents = scheduleClasses.flatMap((cls) =>
            cls.schedule
              .filter((slot) => dayToColIndex(slot.day) === colIdx)
              .map((slot) => ({ ...slot, classInfo: cls })),
          )

          return (
            <div
              key={`events-col-${colIdx}`}
              className="pointer-events-none relative h-full w-full"
              style={{
                gridRow: `2 / span ${hourSlots.length}`,
                gridColumn: colIdx + 2,
              }}
            >
              {dayEvents.map((slot, idx) => {
                const startMinutes = timeToMinutes(slot.startTime)
                const endMinutes = timeToMinutes(slot.endTime)
                const startOffset = startMinutes - startHour * 60
                const duration = endMinutes - startMinutes

                const topPx = (startOffset / 60) * ROW_HEIGHT
                const heightPx = (duration / 60) * ROW_HEIGHT

                const info = getSubjectInformationByCode(slot.classInfo.code)
                const availableClasses = info?.classes || []
                const hasMultipleClasses = availableClasses.length > 1
                const subjectObj =
                  selectedCurriculum?.subjects.find(
                    (s) => s.code === slot.classInfo.code,
                  ) ||
                  ({
                    id: slot.classInfo.code,
                    code: slot.classInfo.code,
                    name: slot.classInfo.name,
                    semester: 0,
                    duration: 0,
                    nature: 'OBRIGATÓRIA',
                    type: 'DISCIPLINA',
                    branch: [],
                    prerequisites: [],
                    equivalences: [],
                    corequisites: [],
                    slug: '',
                  } as Subject)

                const dropdownKey = `${slot.classInfo.code}-${slot.id}-${idx}`

                return (
                  <DropdownMenu
                    key={dropdownKey}
                    open={activeDropdownKey === dropdownKey}
                    onOpenChange={(open) => {
                      setActiveDropdownKey(open ? dropdownKey : null)
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <div
                        className={cn(
                          cardContainerVariants({
                            color: slot.classInfo.color,
                          }),
                          (slot.classInfo.changed || slot.classInfo.removed) &&
                            'border-2 border-dashed border-amber-500 dark:border-amber-400',
                        )}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                        }}
                      >
                        <div
                          title={titleCase(slot.classInfo.name)}
                          className="line-clamp-3 font-semibold md:text-[13px] md:leading-tight"
                        >
                          {isMobile
                            ? abbreviate(slot.classInfo.name)
                            : titleCase(slot.classInfo.name)}
                        </div>
                        <div className="truncate">
                          {slotLabel(slot.startTime, slot.endTime, isMobile)}
                          {!isMobile &&
                            (slot.classInfo.removed
                              ? ' · fora do SIGAA'
                              : slot.classInfo.changed
                                ? ' · novo horário'
                                : ` · T${slot.classInfo.sectionId}`)}
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      className="z-900 min-w-36"
                    >
                      {hasMultipleClasses && (
                        <DropdownMenuItem
                          onSelect={() => {
                            setExchangeSubject(subjectObj)
                            setIsExchangeOpen(true)
                          }}
                          className="cursor-pointer gap-2"
                        >
                          <ArrowsLeftRightIcon
                            weight="bold"
                            className="size-4"
                          />
                          <span>Trocar turma</span>
                        </DropdownMenuItem>
                      )}
                      {hasMultipleClasses && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onSelect={() => removeClassFromSchedule(slot.classInfo)}
                        className="cursor-pointer gap-2 text-red-600 focus:bg-red-500/10 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-500/20 dark:focus:text-red-300"
                      >
                        <TrashIcon weight="bold" className="size-4" />
                        <span>Deletar</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              })}
            </div>
          )
        })}
      </div>

      {exchangeSubject && (
        <SelectedSubjectDialog
          open={isExchangeOpen}
          onOpenChange={setIsExchangeOpen}
          subject={exchangeSubject}
        />
      )}
    </section>
  )
}
