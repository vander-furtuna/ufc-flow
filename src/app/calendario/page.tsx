'use client'

import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/theme-toggle'
import Link from 'next/link'
import { ListView } from './components/list-view'
import { useState } from 'react'
import { CalendarView } from './components/calendar-view'
import { Calendar, CircleAlert, List, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Glow } from '@/components/glow'
import { COLORS } from '@/data/colors'

export default function AcademicCalendarPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportantEvents, setShowImportantEvents] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="flex h-dvh w-full max-w-7xl flex-col items-center justify-start overflow-hidden">
      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-col gap-4 p-2 transition-all lg:p-6',
          view === 'list' && 'px-4 pt-4 pb-0 lg:pb-0!',
        )}
      >
        <header className="bg-accent/30 border-border/50 flex h-18 w-full shrink-0 items-center justify-between rounded-lg border px-3 py-4 sm:px-4">
          <Link href="/" aria-label="Home">
            <Logo className="h-10" id="tour-return" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-muted flex rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className={cn(
                  'text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-medium transition-all duration-200',
                  view === 'list' && 'bg-background text-primary border-border',
                )}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn(
                  'text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-medium transition-all duration-200',
                  view === 'calendar' &&
                    'bg-background text-primary border-border',
                )}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Calendário</span>
              </button>
            </div>
            <ModeToggle />
          </div>
        </header>
        {view === 'list' ? (
          <ListView
            search={searchQuery}
            showImportantEvents={showImportantEvents}
          />
        ) : (
          <CalendarView />
        )}
        {view === 'list' && (
          <div className="fixed bottom-8 left-0 z-50 flex w-full justify-center gap-1 px-4">
            <div className="border-border bg-accent/70 relative flex h-12 w-full max-w-96 items-center justify-center gap-2 overflow-hidden rounded-full border px-3 shadow-lg backdrop-blur-md transition-all">
              <Search className="text-muted-foreground size-6 shrink-0" />

              <input
                onChange={(event) => setSearchQuery(event.target.value)}
                value={searchQuery}
                type="text"
                className="h-full w-full border-0 bg-transparent text-sm outline-0 transition-all"
                placeholder="Pesquisar evento"
              />
              {searchQuery.length > 0 && (
                <>
                  <div className="bg-muted-foreground/50 h-4 w-px" />
                  <button
                    type="button"
                    className="transition-all ease-in-out active:scale-90"
                    onClick={() => setSearchQuery('')}
                  >
                    <X />
                  </button>
                </>
              )}
            </div>
            <button
              className="border-border bg-accent/70 hover:bg-accent/80 text-foreground/80 hover:text-foreground relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-lg backdrop-blur-md transition-all active:scale-95"
              onClick={() => setShowImportantEvents(!showImportantEvents)}
              aria-label="Toggle Important Events"
            >
              <Glow
                colors={COLORS.COMPULSORY}
                className="absolute -bottom-32 size-16 opacity-0 blur-lg transition-all duration-500 data-[state=on]:-bottom-8 data-[state=on]:opacity-100"
                data-state={showImportantEvents ? 'on' : 'off'}
              />

              <CircleAlert className="relative z-20" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
