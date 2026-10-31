'use client'

import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'
import { cn } from '@/lib/utils'
import { getFortalezaTodayDate } from '@/lib/ru-scraper'
import { WeekDayColumn } from './week-day-column'
import type { RUMenuWeek, WeekMealFilter } from '@/types/ru'

interface WeekBoardProps {
  week: RUMenuWeek
  activeMealFilter: WeekMealFilter
  searchQuery?: string
  onlyVegetarian?: boolean
  glutenFree?: boolean
  lactoseFree?: boolean
  onSelectDay: (date: string) => void
  todayDate?: string
}

export function WeekBoard({
  week,
  activeMealFilter,
  searchQuery = '',
  onlyVegetarian = false,
  glutenFree = false,
  lactoseFree = false,
  onSelectDay,
  todayDate = getFortalezaTodayDate(),
}: WeekBoardProps) {
  const { scrollRef, showLeftShadow, showRightShadow } =
    useHorizontalScrollWithOverlay<HTMLDivElement>({
      mode: 'auto',
      threshold: 10,
    })

  return (
    <div className="relative w-full">
      {/* Sombra de overflow à esquerda para mobile e telas sem grid */}
      <div
        className={cn(
          'from-background via-background/70 pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-5 bg-linear-to-r to-transparent transition-opacity duration-300 lg:hidden',
          showLeftShadow ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Sombra de overflow à direita para mobile e telas sem grid */}
      <div
        className={cn(
          'from-background via-background/70 pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-5 bg-linear-to-l to-transparent transition-opacity duration-300 lg:hidden',
          showRightShadow ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Grid de 5 colunas no Desktop e Carrossel Snap suave no Mobile/Tablet */}
      <div
        ref={scrollRef}
        className="flex w-full snap-x scroll-pr-6 scroll-pl-6 gap-3 overflow-x-auto px-1.5 pt-1 pb-4 sm:scroll-pr-8 sm:scroll-pl-8 sm:px-2 lg:grid lg:scroll-p-0 lg:grid-cols-5 lg:gap-3.5 lg:overflow-visible lg:px-0"
      >
        {week.days.map((day) => {
          const isToday = day.date === todayDate

          return (
            <div key={day.id} className="snap-start">
              <WeekDayColumn
                day={day}
                activeMealFilter={activeMealFilter}
                searchQuery={searchQuery}
                onlyVegetarian={onlyVegetarian}
                glutenFree={glutenFree}
                lactoseFree={lactoseFree}
                onSelectDay={onSelectDay}
                isToday={isToday}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
