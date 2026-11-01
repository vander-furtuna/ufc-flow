'use client'

import { Glow } from '@/components/glow'
import { useCalendar } from '@/contexts/calendar'
import { COLORS } from '@/data/colors'
import { cn } from '@/lib/utils'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
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
  const { events, isLoading } = useCalendar()

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
          className="h-full border border-border bg-muted/20 md:h-full"
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
            'group relative h-full cursor-pointer overflow-hidden border border-border bg-card p-1 transition-all hover:bg-accent/60 sm:p-2 md:h-32',
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
                'flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors',
                hasEvents && 'border bg-accent text-foreground',
                d.toDateString() === new Date().toDateString() &&
                  'border bg-primary text-primary-foreground',
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
                      'truncate rounded bg-accent px-1 py-0.5 text-[10px] text-foreground/90',
                      event.isImportant &&
                        'bg-compulsory font-semibold text-background',
                    )}
                  >
                    {event.description}
                  </div>
                ))}
              {dayEvents.length > 2 && (
                <div className="pl-1 text-[10px] font-medium text-muted-foreground">
                  + {dayEvents.length - 2}
                </div>
              )}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded border border-border bg-popover px-2 py-1 text-[10px] text-popover-foreground backdrop-blur-sm">
              Ver Detalhes
            </span>
          </div>
        </div>,
      )
    }

    return days
  }

  return (
    <div className="flex max-h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors">
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <h2 className="flex flex-col gap-x-1 font-clash text-2xl font-semibold text-card-foreground capitalize sm:flex-row sm:items-center sm:text-3xl">
          {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}
          <span className="font-light text-muted-foreground">
            {currentDate.getFullYear()}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-full border border-border p-2 text-foreground transition-colors hover:bg-muted"
          >
            <CaretLeftIcon weight="bold" className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="hidden rounded-lg border border-border bg-muted px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent sm:block"
          >
            Resetar
          </button>
          <button
            onClick={nextMonth}
            className="rounded-full border border-border p-2 text-foreground transition-colors hover:bg-muted"
          >
            <CaretRightIcon weight="bold" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/50">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-bold tracking-wider text-muted-foreground uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      <div
        className={cn(
          'grid max-h-full no-scrollbar auto-rows-[8rem] grid-cols-7 overflow-y-auto border-l border-border',
          isLoading && events.length === 0 && 'animate-pulse opacity-60',
        )}
      >
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
