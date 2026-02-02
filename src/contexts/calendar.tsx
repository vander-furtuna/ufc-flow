'use client'

import { useCalendarManager } from '@/lib/indexeddb'
import type { MonthGroup } from '@/types/calendar'
import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useMemo } from 'react'
import { useClass } from './class'

export type CalendarContextType = {
  monthGroups: MonthGroup[] | null
  events: MonthGroup['events']
  upcomingEvents: MonthGroup['events']
}

export const CalendarContext = createContext<CalendarContextType>(
  {} as CalendarContextType,
)

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { currentYear } = useClass()
  const { fetchCalendar } = useCalendarManager()

  const { data: monthGroups } = useQuery({
    queryKey: ['calendar', currentYear],
    queryFn: async () => await fetchCalendar(currentYear!),
    enabled: !!currentYear,
  })

  const events = monthGroups?.flatMap((group) => group.events) ?? []

  const upcomingEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const events = monthGroups?.flatMap((group) => group.events)

    if (!events) return []

    return events
      .filter((event) => {
        // Para eventos de intervalo, pegamos apenas o início para não repetir na sidebar
        if (event.isRange && !event.isRangeStart) return false
        return new Date(event.date) >= today
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3)
  }, [monthGroups])

  const value = {
    monthGroups: monthGroups ?? null,
    events,
    upcomingEvents,
  }

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)

  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }

  return context
}
