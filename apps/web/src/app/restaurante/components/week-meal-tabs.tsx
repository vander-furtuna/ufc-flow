'use client'

import {
  CoffeeIcon,
  ForkKnifeIcon,
  MoonIcon,
  SquaresFourIcon,
  type IconProps,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { WeekMealFilter } from '@/types/ru'
import type { ComponentType } from 'react'

interface WeekMealTabItem {
  type: WeekMealFilter
  label: string
  icon: ComponentType<IconProps>
  available: boolean
}

interface WeekMealTabsProps {
  activeMealFilter: WeekMealFilter
  onSelectMealFilter: (filter: WeekMealFilter) => void
  hasDesjejum?: boolean
  hasAlmoco?: boolean
  hasJantar?: boolean
}

export function WeekMealTabs({
  activeMealFilter,
  onSelectMealFilter,
  hasDesjejum = true,
  hasAlmoco = true,
  hasJantar = true,
}: WeekMealTabsProps) {
  const tabs: WeekMealTabItem[] = [
    {
      type: 'almoco',
      label: 'Almoço',
      icon: ForkKnifeIcon,
      available: hasAlmoco,
    },
    {
      type: 'jantar',
      label: 'Jantar',
      icon: MoonIcon,
      available: hasJantar,
    },
    {
      type: 'desjejum',
      label: 'Desjejum',
      icon: CoffeeIcon,
      available: hasDesjejum,
    },
    {
      type: 'all',
      label: 'Todas',
      icon: SquaresFourIcon,
      available: true,
    },
  ]

  return (
    <div className="bg-muted/70 border-border/50 flex w-full max-w-lg items-center justify-between rounded-xl border p-1 backdrop-blur-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeMealFilter === tab.type

        return (
          <button
            key={tab.type}
            type="button"
            onClick={() => onSelectMealFilter(tab.type)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 select-none sm:px-3 sm:py-2 sm:text-sm',
              isActive
                ? 'bg-background text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
              !tab.available && 'opacity-50',
            )}
          >
            <Icon weight="bold" className="size-3.5 shrink-0 sm:size-4" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
