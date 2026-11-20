'use client'

import { Glow } from '@/components/glow'
import { useCalendar } from '@/contexts/calendar'
import { COLORS } from '@/data/colors'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { normalizeWords } from '@/utils/normalize-words'
import { CalendarBlankIcon, CalendarDotsIcon } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import type { MonthGroup } from '@/types/calendar'
import { UpcomingEvents } from './upcoming-events'

type ListViewProps = {
  search?: string
  showImportantEvents?: boolean
}

function isCurrentMonthGroup(group: MonthGroup): boolean {
  const now = new Date()
  if (group.year !== now.getFullYear()) return false

  const currentMonthName = now
    .toLocaleString('pt-BR', { month: 'long' })
    .toLowerCase()
  if (group.monthName.toLowerCase() === currentMonthName) return true

  // Fallback: verifica pelo primeiro evento do grupo
  if (group.events.length > 0) {
    const firstEventDate = new Date(group.events[0].date)
    return (
      firstEventDate.getUTCMonth() === now.getMonth() ||
      firstEventDate.getMonth() === now.getMonth()
    )
  }

  return false
}

export function ListView({ search, showImportantEvents }: ListViewProps) {
  const { monthGroups, isLoading, isError, calendarYear } = useCalendar()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentMonthRef = useRef<HTMLElement>(null)
  const hasScrolledRef = useRef(false)

  const debouncedSearch = useDebounce(search, 300)

  const filteredMonthGroups = monthGroups
    ?.map((group) => {
      let events = debouncedSearch
        ? group.events.filter((event) => {
            const normalizedEventDesc = normalizeWords(event.description)
            const normalizedSearch = normalizeWords(debouncedSearch)
            return normalizedEventDesc.includes(normalizedSearch)
          })
        : group.events

      if (showImportantEvents) {
        events = events.filter((event) => event.isImportant)
      }

      if (events.length === 0) {
        return null
      }

      return { ...group, events }
    })
    .filter((group) => group !== null)

  // Scrola automaticamente para o mês/ano atual ao entrar na página
  useEffect(() => {
    if (hasScrolledRef.current || search) return
    if (!filteredMonthGroups || filteredMonthGroups.length === 0) return

    const timer = setTimeout(() => {
      if (currentMonthRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const element = currentMonthRef.current

        const containerRect = container.getBoundingClientRect()
        const elementRect = element.getBoundingClientRect()
        const scrollTarget =
          elementRect.top - containerRect.top + container.scrollTop

        container.scrollTo({
          top: Math.max(0, scrollTarget - 8),
          behavior: 'smooth',
        })
        hasScrolledRef.current = true
      } else if (currentMonthRef.current) {
        currentMonthRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
        hasScrolledRef.current = true
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [filteredMonthGroups, search])

  return (
    <article className="relative flex min-h-0 w-full flex-1 flex-col-reverse gap-4 md:flex-row">
      <div
        ref={scrollContainerRef}
        className="md:calendar-scrollbar h-full w-full max-w-4xl overflow-y-auto pb-16"
      >
        {isLoading && (!monthGroups || monthGroups.length === 0) ? (
          <div className="w-full space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="flex items-center gap-3 py-3">
                  <div className="bg-muted size-9 rounded-md" />
                  <div className="bg-muted h-6 w-36 rounded-md" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div
                      key={j}
                      className="bg-card/40 border-border/40 flex h-20 items-center rounded-lg border p-3"
                    >
                      <div className="bg-muted/70 h-8 w-16 rounded-md" />
                      <div className="ml-4 grow space-y-2">
                        <div className="bg-muted/70 h-4 w-3/4 rounded-md" />
                        <div className="bg-muted/50 h-3 w-1/2 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredMonthGroups && filteredMonthGroups.length > 0 ? (
          filteredMonthGroups.map((group, idx) => {
            const isCurrentMonth = isCurrentMonthGroup(group)

            return (
              <section
                key={`${group.year}-${group.monthName}`}
                ref={isCurrentMonth ? currentMonthRef : undefined}
                id={isCurrentMonth ? 'current-month-section' : undefined}
                className="animate-in fade-in slide-in-from-bottom-4 mb-6 duration-500"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="bg-background/70 border-border sticky top-0 z-30 mb-4 flex items-center justify-between border-b py-3 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground rounded-md p-2 shadow-sm">
                      <CalendarDotsIcon weight="bold" className="h-5 w-5" />
                    </div>
                    <h2 className="text-foreground font-clash text-2xl font-semibold tracking-tight capitalize">
                      {group.monthName}{' '}
                      <span className="text-muted-foreground font-normal">
                        {group.year}
                      </span>
                    </h2>
                  </div>

                  {isCurrentMonth && (
                    <span className="border-primary/30 bg-primary/10 text-primary rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                      Mês atual
                    </span>
                  )}
                </div>

                <div className="grid gap-3">
                  {group.events.map((event) => {
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          'group bg-card border-border hover:border-primary/30 relative overflow-hidden rounded-lg border p-3 shadow-sm transition-all duration-200 hover:shadow-md',
                        )}
                      >
                        {event.isImportant && (
                          <Glow
                            colors={COLORS.COMPULSORY}
                            className="absolute top-1/2 -left-48 size-72 -translate-y-1/2 blur-2xl"
                          />
                        )}
                        <div className="relative z-20 flex flex-col gap-2 md:flex-row md:items-start">
                          <div className="shrink-0 md:w-20">
                            <span
                              className={cn(
                                'bg-primary/10 text-primary font-clash inline-flex min-w-12 items-center justify-center rounded-md px-3 py-1 text-sm font-semibold',
                                event.isImportant &&
                                  'bg-background/20 text-foreground',
                              )}
                            >
                              {event.originalDateString}
                            </span>
                          </div>
                          <div className="grow">
                            <p className="text-card-foreground group-hover:text-card-foreground text-sm leading-relaxed">
                              {event.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {event.description.includes('(PG)') && (
                                <span className="bg-accent border-border text-foreground/90 relative mt-2 inline-flex items-center overflow-hidden rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider shadow-2xs select-none">
                                  <Glow
                                    colors="#a855f7"
                                    className="pointer-events-none absolute -left-2 size-6 opacity-90 blur-xs"
                                  />
                                  <span className="relative z-10">
                                    PÓS-GRADUAÇÃO
                                  </span>
                                </span>
                              )}
                              {event.description.includes('(EAD)') && (
                                <span className="bg-accent border-border text-foreground/90 relative mt-2 inline-flex items-center overflow-hidden rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider shadow-2xs select-none">
                                  <Glow
                                    colors="#10b981"
                                    className="pointer-events-none absolute -left-2 size-6 opacity-90 blur-xs"
                                  />
                                  <span className="relative z-10">EAD</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
        ) : (
          <div className="w-full p-8 text-center">
            <CalendarBlankIcon
              weight="bold"
              className="mx-auto mb-4 h-12 w-12 opacity-20"
            />
            <p className="text-muted-foreground text-sm">
              {isError
                ? `O calendário de ${calendarYear} ainda não está disponível no site da UFC.`
                : 'Nenhum evento encontrado.'}
            </p>
          </div>
        )}
      </div>
      <UpcomingEvents />
    </article>
  )
}
