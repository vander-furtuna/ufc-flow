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

export type CalendarContextType = {
  monthGroups: MonthGroup[] | null
  events: MonthGroup['events']
  upcomingEvents: MonthGroup['events']
  isLoading: boolean
  isFetching: boolean
  lastUpdatedAt: Date | null
  refetchCalendar: () => Promise<void>
  // Ano do calendário, independente do semestre escolhido na agenda
  calendarYear: number
  calendarYears: number[]
  changeCalendarYear: (year: number) => void
  // O site da UFC ainda não publicou o ano (ou está fora do ar sem cache)
  isError: boolean
}

export const CalendarContext = createContext<CalendarContextType>(
  {} as CalendarContextType,
)

// O ano corrente e o seguinte: a UFC publica o calendário do próximo ano
// antes de ele começar
const yearsOnOffer = () => {
  const thisYear = new Date().getFullYear()
  return [thisYear, thisYear + 1]
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [calendarYears] = useState(yearsOnOffer)
  const [currentYear, setCurrentYear] = useState(calendarYears[0])
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
    isError,
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
    // Ano não publicado responde 404: não adianta insistir
    retry: false,
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
      calendarYear: currentYear,
      calendarYears,
      changeCalendarYear: setCurrentYear,
      isError,
    }),
    [
      monthGroups,
      events,
      upcomingEvents,
      isLoading,
      isFetching,
      lastUpdatedAt,
      refetchCalendar,
      currentYear,
      calendarYears,
      isError,
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
