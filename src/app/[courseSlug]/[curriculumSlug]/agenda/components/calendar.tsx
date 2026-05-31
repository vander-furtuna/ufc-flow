import { useCourse } from '@/contexts/course'
import { useSchedule } from '@/contexts/schedule'
import { useMediaQuery } from '@/hooks/use-media-query'
import { dayToColIndex } from '@/utils/day-to-col'
import { timeToMinutes } from '@/utils/time-to-minutes'
import { cva } from 'class-variance-authority'
import { Clock } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Fragment } from 'react/jsx-runtime'

const ROW_HEIGHT = 60
const HEADER_HEIGHT = 40
const startHour = 7
const endHour = 22

const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
const shortDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

const hourSlots = Array.from(
  { length: endHour - startHour + 1 },
  (_, i) => i + startHour,
)

const cardContainerVariants = cva(
  'pointer-events-auto absolute right-0.5 left-0.5 z-10 flex cursor-pointer flex-col overflow-hidden rounded border p-1.5 text-xs transition-colors',
  {
    variants: {
      color: {
        red: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/90 dark:hover:bg-red-900 dark:border-red-700 dark:text-red-300',
        orange:
          'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/90 dark:hover:bg-amber-900 dark:border-amber-700 dark:text-amber-300',
        lime: 'bg-lime-100 border-lime-300 text-lime-800 dark:bg-lime-900/90 dark:hover:bg-lime-900 dark:border-lime-700 dark:text-lime-300',
        green:
          'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/90 dark:hover:bg-green-900 dark:border-green-700 dark:text-green-200',
        emerald:
          'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/90 dark:hover:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-200',
        teal: 'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/90 dark:hover:bg-teal-900 dark:border-teal-700 dark:text-teal-200',
        cyan: 'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-900/90 dark:hover:bg-cyan-900 dark:border-cyan-700 dark:text-cyan-200',
        blue: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/90 dark:hover:bg-blue-900 dark:border-blue-700 dark:text-blue-200',
        violet:
          'bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-900/90 dark:hover:bg-violet-900 dark:border-violet-700 dark:text-violet-200',
        fuschia:
          'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-800 dark:bg-fuchsia-900/90 dark:hover:bg-fuchsia-900 dark:border-fuchsia-700 dark:text-fuchsia-200',
        pink: 'bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/90 dark:hover:bg-pink-900 dark:border-pink-700 dark:text-pink-200',
        rose: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/90 dark:hover:bg-rose-900 dark:border-rose-700 dark:text-rose-200',
      },
    },
    defaultVariants: { color: 'blue' },
  },
)

type CalendarProps = ComponentProps<'div'>

export function Calendar({ ref, ...props }: CalendarProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { scheduleClasses } = useSchedule()
  const { selectedCurriculum } = useCourse()

  return (
    <section
      className="bg-background border-border/80 flex h-full flex-col overflow-hidden rounded-b-md border md:rounded-lg"
      id="tour-calendar"
    >
      <div
        {...props}
        className="bg-background calendar-scrollbar relative grid flex-1 overflow-auto"
        ref={ref as React.RefObject<HTMLDivElement>}
        style={{
          gridTemplateColumns: `${isMobile ? '36px' : '60px'} repeat(5, minmax(${isMobile ? 60 : 160}px, 1fr))`,
          gridTemplateRows: `${HEADER_HEIGHT}px repeat(${hourSlots.length}, ${ROW_HEIGHT}px)`,
        }}
      >
        <div className="bg-accent/70 border-border/80 sticky top-0 left-0 z-40 flex h-full items-center justify-center border-r border-b backdrop-blur-lg">
          <Clock className="size-5 text-gray-400" />
        </div>

        {(isMobile ? shortDays : days).map((d, i) => (
          <div
            key={d}
            className="bg-accent/70 border-border/80 sticky top-0 z-30 flex items-center justify-center border-r border-b backdrop-blur-lg last:border-r-0"
            style={{ gridRow: 1, gridColumn: i + 2 }}
          >
            <span className="text-foreground/90 text-xs font-bold tracking-wide uppercase">
              {d}
            </span>
          </div>
        ))}

        {hourSlots.map((h, rowIdx) => (
          <Fragment key={h}>
            <div
              className="bg-accent/70 border-border/70 text-foreground/80 sticky left-0 z-30 border-r border-b p-2 text-right text-xs backdrop-blur-[2px]"
              style={{ gridRow: rowIdx + 2, gridColumn: 1 }}
            >
              {isMobile ? `${h}h` : `${h}:00`}
            </div>
            {days.map((_, colIdx) => (
              <div
                key={`cell-${rowIdx}-${colIdx}`}
                className="bg-background border-border/70 border-r border-b last:border-r-0"
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

                return (
                  <div
                    key={`${slot.id}-${idx}`}
                    className={cardContainerVariants({
                      color: slot.classInfo.color,
                    })}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                    }}
                  >
                    <div className="leading-tight font-bold text-inherit">
                      {slot.classInfo.name}
                    </div>
                    <div className="truncate text-[10px] text-inherit">
                      {slot.classInfo.code} • Turma {slot.classInfo.sectionId}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}
