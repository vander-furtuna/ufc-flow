import { Glow } from '@/components/glow'
import { useCalendar } from '@/contexts/calendar'
import { COLORS } from '@/data/colors'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import CalendarDayDialog from './calendar-day-dialog'

const getUtcParts = (isoDateString: string) => {
  const d = new Date(isoDateString)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
  }
}

const toUtcIsoDate = (year: number, monthIndex: number, day: number) => {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString()
}

export function CalendarView() {
  const { events } = useCalendar()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedDateIso, setSelectedDateIso] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    )
  }

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    )
  }

  const monthEvents = useMemo(() => {
    return events.filter(
      (e) =>
        getUtcParts(e.date).month === currentDate.getMonth() &&
        getUtcParts(e.date).year === currentDate.getFullYear(),
    )
  }, [events, currentDate])

  const handleDayClick = (day: number) => {
    setSelectedDay(day)
    setSelectedDateIso(
      toUtcIsoDate(currentDate.getFullYear(), currentDate.getMonth(), day),
    )
    setIsModalOpen(true)
  }

  const getEventsForDay = (day: number) => {
    return monthEvents.filter((e) => getUtcParts(e.date).day === day)
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="bg-muted/20 border-border h-full border md:h-full"
        />,
      )
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day)
      const hasEvents = dayEvents.length > 0
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const isWeekend = d.getDay() === 0 || d.getDay() === 6
      const isDayImportant = dayEvents.some((event) => event.isImportant)

      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={cn(
            'border-border hover:bg-accent/60 group bg-card relative h-full cursor-pointer overflow-hidden border p-1 transition-all sm:p-2 md:h-32',
            isWeekend && 'bg-muted/30',
          )}
        >
          {isDayImportant && (
            <Glow
              colors={COLORS.COMPULSORY}
              className="absolute -bottom-12 left-1/2 z-1 size-32 -translate-x-1/2 blur-2xl"
            />
          )}
          <div className="relative z-10 flex items-start justify-between">
            <span
              className={cn(
                'text-muted-foreground flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium transition-colors',
                hasEvents && 'bg-accent text-foreground border',
                d.toDateString() === new Date().toDateString() &&
                  'bg-primary text-primary-foreground border',
              )}
            >
              {day}
            </span>
          </div>

          {hasEvents && (
            <div className="relative z-10 mt-2 space-y-1">
              {dayEvents
                .sort((a, b) => Number(b.isImportant) - Number(a.isImportant))
                .slice(0, 2)
                .map((event, idx) => (
                  <div
                    key={`${day}-${idx}`}
                    className={cn(
                      'bg-accent text-foreground/90 truncate rounded px-1 py-0.5 text-[10px]',
                      event.isImportant &&
                        'bg-compulsory text-background font-semibold',
                    )}
                  >
                    {event.description}
                  </div>
                ))}
              {dayEvents.length > 2 && (
                <div className="text-muted-foreground pl-1 text-[10px] font-medium">
                  + {dayEvents.length - 2}
                </div>
              )}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="bg-popover text-popover-foreground border-border rounded border px-2 py-1 text-[10px] backdrop-blur-sm">
              Ver Detalhes
            </span>
          </div>
        </div>,
      )
    }

    return days
  }

  return (
    <div className="bg-card border-border flex max-h-full flex-col overflow-hidden rounded-lg border transition-colors">
      <div className="bg-card border-border flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-card-foreground font-clash flex flex-col gap-x-1 text-2xl font-semibold capitalize sm:flex-row sm:items-center sm:text-3xl">
          {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}
          <span className="text-muted-foreground font-light">
            {currentDate.getFullYear()}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="hover:bg-muted text-foreground border-border rounded-full border p-2 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="bg-muted hover:bg-accent text-foreground border-border hidden rounded-lg border px-4 py-2 text-xs font-medium transition-colors sm:block"
          >
            Resetar
          </button>
          <button
            onClick={nextMonth}
            className="hover:bg-muted text-foreground border-border rounded-full border p-2 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-muted/50 border-border grid grid-cols-7 border-b">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-muted-foreground py-3 text-center text-xs font-bold tracking-wider uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="border-border no-scrollbar grid max-h-full auto-rows-[8rem] grid-cols-7 overflow-y-auto border-l">
        {renderCalendarDays()}
      </div>

      <CalendarDayDialog
        events={selectedDay ? getEventsForDay(selectedDay) : []}
        date={selectedDateIso}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  )
}
