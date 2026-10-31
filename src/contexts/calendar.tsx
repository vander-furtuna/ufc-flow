'use client'

import { useCalendarManager } from '@/lib/indexeddb'
import type { MonthGroup } from '@/types/calendar'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import { useClass } from './class'

export type CalendarContextType = {
  monthGroups: MonthGroup[] | null
  events: MonthGroup['events']
  upcomingEvents: MonthGroup['events']
  isLoading: boolean
  isFetching: boolean
  lastUpdatedAt: Date | null
  refetchCalendar: () => Promise<void>
}

export const CalendarContext = createContext<CalendarContextType>(
  {} as CalendarContextType,
)

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { currentYear } = useClass()
  const { fetchCalendar, getCalendarLastUpdateTime } = useCalendarManager()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  // O fetch e verificação só devem ser acionados quando o usuário estiver na página do calendário
  const isCalendarPage = pathname?.startsWith('/calendario') ?? false
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const updateLastUpdateTime = useCallback(async () => {
    if (currentYear) {
      const time = await getCalendarLastUpdateTime(currentYear)
      setLastUpdatedAt(time)
    }
  }, [currentYear, getCalendarLastUpdateTime])

  const {
    data: monthGroups,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['calendar', currentYear],
    queryFn: async () => {
      const data = await fetchCalendar(currentYear!)
      await updateLastUpdateTime()
      return data
    },
    enabled: !!currentYear && isCalendarPage,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 0,
  })

  // Sincroniza a data da última atualização ao entrar na página do calendário
  useEffect(() => {
    if (isCalendarPage && currentYear) {
      updateLastUpdateTime()
    }
  }, [isCalendarPage, currentYear, updateLastUpdateTime])

  const refetchCalendar = useCallback(async () => {
    if (!currentYear) return
    const data = await fetchCalendar(currentYear, true)
    queryClient.setQueryData(['calendar', currentYear], data)
    await updateLastUpdateTime()
  }, [currentYear, fetchCalendar, queryClient, updateLastUpdateTime])

  const events = useMemo(
    () => monthGroups?.flatMap((group) => group.events) ?? [],
    [monthGroups],
  )

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    const todayUtcMs = Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )

    const allEvents = monthGroups?.flatMap((group) => group.events)

    if (!allEvents) return []

    return allEvents
      .filter((event) => {
        // Para eventos de intervalo, pegamos apenas o início para não repetir na sidebar
        if (event.isRange && !event.isRangeStart) return false
        return Date.parse(event.date) >= todayUtcMs
      })
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
      .slice(0, 3)
  }, [monthGroups])

  const value = useMemo(
    () => ({
      monthGroups: monthGroups ?? null,
      events,
      upcomingEvents,
      isLoading,
      isFetching,
      lastUpdatedAt,
      refetchCalendar,
    }),
    [
      monthGroups,
      events,
      upcomingEvents,
      isLoading,
      isFetching,
      lastUpdatedAt,
      refetchCalendar,
    ],
  )

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
