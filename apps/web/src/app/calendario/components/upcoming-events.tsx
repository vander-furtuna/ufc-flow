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
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 font-clash text-sm font-semibold text-primary',
            event.isImportant && 'bg-compulsory text-background',
          )}
        >
          {formatDay(event)}
        </span>
        {event.isRange && (
          <span className="text-xs text-muted-foreground">
            Início de período
          </span>
        )}
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-card-foreground">
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
      <span className="shrink-0 rounded-md bg-primary p-2 text-primary-foreground shadow-sm">
        <ClockIcon weight="bold" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col items-start text-left">
        <span className="font-clash text-xl font-semibold tracking-tight text-foreground">
          Próximos eventos
        </span>
        {!expanded && next && (
          <span className="w-full truncate text-xs text-muted-foreground">
            {formatDay(next)} · {next.description}
          </span>
        )}
      </span>
    </span>
  )

  return (
    <aside className="w-full shrink-0 md:w-72 lg:w-80">
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-sm md:sticky md:top-0">
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
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {title}
              <CaretDownIcon
                weight="bold"
                aria-hidden
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform',
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
                  className="animate-pulse space-y-2 rounded-lg border border-border p-3"
                >
                  <div className="h-5 w-16 rounded-md bg-muted" />
                  <div className="h-3 w-full rounded bg-muted/70" />
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
            <p className="p-2 text-center text-sm text-muted-foreground">
              Nenhum evento futuro neste calendário.
            </p>
          )}
        </div>
      </section>
    </aside>
  )
}
