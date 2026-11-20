'use client'

import { useCalendar } from '@/contexts/calendar'
import { cn } from '@/lib/utils'
import type { AcademicEvent } from '@/types/calendar'
import { CaretDownIcon, ClockIcon } from '@phosphor-icons/react'
import { useId, useState, useSyncExternalStore } from 'react'

// No desktop a lista fica sempre aberta ao lado; no celular, recolhida acima
// dos meses, com o próximo evento à mostra
const DESKTOP = '(min-width: 768px)'
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const useIsDesktop = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  )

const formatDay = (event: AcademicEvent) =>
  new Date(event.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })

function EventItem({ event }: { event: AcademicEvent }) {
  return (
    <li className="bg-background border-border flex flex-col gap-2 rounded-lg border p-3 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'bg-primary/10 text-primary font-clash inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-semibold',
            event.isImportant && 'bg-compulsory text-background',
          )}
        >
          {formatDay(event)}
        </span>
        {event.isRange && (
          <span className="text-muted-foreground text-xs">
            Início de período
          </span>
        )}
      </div>
      <p className="text-card-foreground line-clamp-3 text-sm leading-relaxed">
        {event.description}
      </p>
    </li>
  )
}

export function UpcomingEvents() {
  const { upcomingEvents, isLoading } = useCalendar()
  const isDesktop = useIsDesktop()
  const [isOpen, setIsOpen] = useState(false)
  const listId = useId()
  const expanded = isDesktop || isOpen
  const [next] = upcomingEvents

  const title = (
    <span className="flex min-w-0 items-center gap-3">
      <span className="bg-primary text-primary-foreground shrink-0 rounded-md p-2 shadow-sm">
        <ClockIcon weight="bold" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col items-start text-left">
        <span className="text-foreground font-clash text-xl font-semibold tracking-tight">
          Próximos eventos
        </span>
        {!expanded && next && (
          <span className="text-muted-foreground w-full truncate text-xs">
            {formatDay(next)} · {next.description}
          </span>
        )}
      </span>
    </span>
  )

  return (
    <aside className="w-full shrink-0 md:w-72 lg:w-80">
      <section className="bg-card border-border flex flex-col gap-3 rounded-lg border p-3 shadow-sm md:sticky md:top-0">
        {isDesktop ? (
          <h2>{title}</h2>
        ) : (
          // Sanfona no celular (padrão WAI-ARIA: botão dentro do título)
          <h2>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={listId}
              onClick={() => setIsOpen((open) => !open)}
              className="focus-visible:ring-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-md focus-visible:ring-2 focus-visible:outline-none"
            >
              {title}
              <CaretDownIcon
                weight="bold"
                aria-hidden
                className={cn(
                  'text-muted-foreground size-4 shrink-0 transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </button>
          </h2>
        )}

        <div id={listId} hidden={!expanded}>
          {isLoading && upcomingEvents.length === 0 ? (
            <ul className="grid gap-2" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="border-border animate-pulse space-y-2 rounded-lg border p-3"
                >
                  <div className="bg-muted h-5 w-16 rounded-md" />
                  <div className="bg-muted/70 h-3 w-full rounded" />
                </li>
              ))}
            </ul>
          ) : upcomingEvents.length > 0 ? (
            <ol className="grid gap-2">
              {upcomingEvents.map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground p-2 text-center text-sm">
              Nenhum evento futuro neste calendário.
            </p>
          )}
        </div>
      </section>
    </aside>
  )
}
