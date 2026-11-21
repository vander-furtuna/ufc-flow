'use client'

import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/theme-toggle'
import Link from 'next/link'
import { ListView } from './components/list-view'
import { useState } from 'react'
import { CalendarView } from './components/calendar-view'
import {
  ArrowsClockwiseIcon,
  CalendarBlankIcon,
  ListIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { COLORS } from '@/data/colors'
import { AppSearchBar } from '@/components/app-search-bar'
import { useCalendar } from '@/contexts/calendar'
import {
  ViewSwitcher,
  type ViewSwitcherOption,
} from '@/components/view-switcher'

type CalendarViewMode = 'list' | 'calendar'

const VIEW_OPTIONS: ViewSwitcherOption<CalendarViewMode>[] = [
  {
    value: 'list',
    label: 'Lista',
    icon: ListIcon,
    title: 'Visualizar eventos em lista',
  },
  {
    value: 'calendar',
    label: 'Calendário',
    icon: CalendarBlankIcon,
    title: 'Visualizar eventos no calendário mensal',
  },
]

export default function AcademicCalendarPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportantEvents, setShowImportantEvents] = useState(false)
  const [view, setView] = useState<CalendarViewMode>('list')
  const {
    lastUpdatedAt,
    isFetching,
    refetchCalendar,
    calendarYear,
    calendarYears,
    changeCalendarYear,
  } = useCalendar()
  const yearOptions: ViewSwitcherOption<string>[] = calendarYears.map(
    (year) => ({
      value: String(year),
      label: String(year),
      title: `Calendário universitário de ${year}`,
    }),
  )

  return (
    <div className="flex h-dvh w-full max-w-7xl flex-col items-center justify-start overflow-hidden">
      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-col gap-4 p-2 transition-all lg:p-6',
          view === 'list' && 'px-4 pt-4 pb-0 lg:pb-0!',
        )}
      >
        <header className="flex w-full shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-3 sm:h-18 sm:flex-nowrap">
          <Link href="/" aria-label="Home">
            <Logo className="h-12" id="tour-return" isResponsive />
          </Link>
          {/* No celular, o ano fica ao lado do logo e os controles descem
              para a linha de baixo */}
          <ViewSwitcher
            options={yearOptions}
            value={String(calendarYear)}
            onValueChange={(year) => changeCalendarYear(Number(year))}
            ariaLabel="Ano do calendário"
            disabled={isFetching}
            className="ml-auto"
          />
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <button
              onClick={refetchCalendar}
              disabled={isFetching}
              title={
                lastUpdatedAt
                  ? `Última atualização: ${lastUpdatedAt.toLocaleDateString('pt-BR')} às ${lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Atualizar calendário'
              }
              aria-label="Atualizar calendário"
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-accent/40 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <ArrowsClockwiseIcon
                weight="bold"
                className={cn('size-4', isFetching && 'animate-spin')}
              />
              <span className="hidden md:inline">
                {isFetching
                  ? 'Atualizando...'
                  : lastUpdatedAt
                    ? `Atualizado em ${lastUpdatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                    : 'Atualizar'}
              </span>
            </button>
            <ViewSwitcher
              options={VIEW_OPTIONS}
              value={view}
              onValueChange={setView}
              ariaLabel="Modo de visualização do calendário"
            />
            <ModeToggle />
          </div>
        </header>
        {view === 'list' ? (
          // A chave reinicia a rolagem até o mês atual ao trocar de ano
          <ListView
            key={calendarYear}
            search={searchQuery}
            showImportantEvents={showImportantEvents}
          />
        ) : (
          <CalendarView key={calendarYear} year={calendarYear} />
        )}
        {view === 'list' && (
          <div className="fixed bottom-8 left-0 z-50 flex w-full justify-center px-4">
            <AppSearchBar
              placeholder="Pesquisar evento"
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              currentNavId="calendario"
              isFilterActive={showImportantEvents}
              filterIcon={
                <WarningCircleIcon
                  weight="bold"
                  data-state={showImportantEvents ? 'active' : 'default'}
                  className="size-5 data-[state=active]:text-foreground sm:size-6"
                />
              }
              onFilterClick={() => setShowImportantEvents(!showImportantEvents)}
              glowColor={COLORS.COMPULSORY}
            />
          </div>
        )}
        <div className="pointer-events-none fixed bottom-0 z-49 h-12 w-full bg-linear-to-b from-transparent to-background" />
      </div>
    </div>
  )
}
