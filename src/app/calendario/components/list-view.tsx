import { Glow } from '@/components/glow'
import { useCalendar } from '@/contexts/calendar'
import { COLORS } from '@/data/colors'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import { normalizeWords } from '@/utils/normalize-words'
import { Calendar, CalendarDays, ChevronUp, Clock } from 'lucide-react'
import { useState } from 'react'

type ListViewProps = {
  search?: string
  showImportantEvents?: boolean
}

export function ListView({ search, showImportantEvents }: ListViewProps) {
  const [showUpcomingEvents, setShowUpcomingEvents] = useState(true)
  const { monthGroups, upcomingEvents } = useCalendar()

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

  return (
    <article className="relative flex min-h-0 w-full flex-1 flex-col-reverse gap-4 md:flex-row">
      <div className="md:calendar-scrollbar h-full w-full max-w-4xl overflow-y-auto pb-16">
        {filteredMonthGroups && filteredMonthGroups.length > 0 ? (
          filteredMonthGroups.map((group, idx) => (
            <section
              key={`${group.year}-${group.monthName}`}
              className="animate-in fade-in slide-in-from-bottom-4 mb-6 duration-500"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="bg-background/70 border-border sticky top-0 z-30 mb-4 flex items-center gap-3 border-b py-3 backdrop-blur">
                <div className="bg-primary text-primary-foreground rounded-md p-2 shadow-sm">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h2 className="text-foreground font-clash text-2xl font-semibold tracking-tight capitalize">
                  {group.monthName}{' '}
                  <span className="text-muted-foreground font-normal">
                    {group.year}
                  </span>
                </h2>
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
                              <span className="mt-2 inline-block rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-purple-500">
                                PÓS-GRADUAÇÃO
                              </span>
                            )}
                            {event.description.includes('(EAD)') && (
                              <span className="mt-2 inline-block rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-green-500">
                                EAD
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
          ))
        ) : (
          <div className="w-full p-8 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p className="text-muted-foreground text-sm">
              Nenhum evento encontrado.
            </p>
          </div>
        )}
      </div>
      <aside className="h-fit w-full shrink-0 lg:w-80">
        <div className="top-24 md:sticky">
          <div className="bg-card border-border overflow-hidden rounded-lg border transition-colors">
            <div className="bg-muted/50 border-border flex items-center justify-between gap-2 border-b px-3 py-3 md:px-5 md:py-4">
              <div className="flex items-center gap-2">
                <Clock className="text-primary h-4 w-4" />
                <h3 className="text-foreground text-sm font-bold tracking-wider uppercase">
                  Próximos Eventos
                </h3>
              </div>

              <button
                className="text-primary text-xs font-medium underline transition-all hover:opacity-80 md:hidden"
                onClick={() => setShowUpcomingEvents(!showUpcomingEvents)}
              >
                <ChevronUp
                  className={cn(
                    'transition-transform',
                    showUpcomingEvents && 'rotate-180',
                  )}
                />
              </button>
            </div>

            <div
              className={cn(
                'max-h-96 overflow-hidden p-2 transition-all duration-400',
                showUpcomingEvents && 'max-h-0 p-0 md:max-h-96 md:p-2',
              )}
            >
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, i) => (
                  <div
                    key={event.id}
                    className={`hover:bg-muted/30 group rounded-lg p-2 py-3 transition-colors md:p-4 ${i !== upcomingEvents.length - 1 ? 'border-border/50 border-b' : ''}`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={cn(
                          'text-primary bg-primary/10 rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                          event.isImportant && 'bg-compulsory text-background',
                        )}
                      >
                        {new Date(event.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          timeZone: 'UTC',
                        })}
                      </span>
                      {event.isRange && (
                        <span className="text-muted-foreground text-[9px] font-medium italic">
                          Início de período
                        </span>
                      )}
                    </div>
                    <p className="text-card-foreground group-hover:text-foreground line-clamp-3 text-xs leading-snug">
                      {event.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground text-xs">
                    Nenhum evento futuro encontrado.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </article>
  )
}
