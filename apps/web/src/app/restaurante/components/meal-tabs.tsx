'use client'

import {
  CoffeeIcon,
  ForkKnifeIcon,
  MoonIcon,
  type IconProps,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { MealType } from '@/types/ru'
import type { ComponentType } from 'react'

interface MealTabItem {
  type: MealType
  label: string
  icon: ComponentType<IconProps>
  available: boolean
}

interface MealTabsProps {
  activeMeal: MealType
  onSelectMeal: (meal: MealType) => void
  hasDesjejum: boolean
  hasAlmoco: boolean
  hasJantar: boolean
}

export function MealTabs({
  activeMeal,
  onSelectMeal,
  hasDesjejum,
  hasAlmoco,
  hasJantar,
}: MealTabsProps) {
  const tabs: MealTabItem[] = [
    {
      type: 'desjejum',
      label: 'Desjejum',
      icon: CoffeeIcon,
      available: hasDesjejum,
    },
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
  ]

  return (
    <div className="bg-muted/70 border-border/50 flex w-full max-w-md items-center justify-between rounded-xl border p-1 backdrop-blur-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeMeal === tab.type

        return (
          <button
            key={tab.type}
            type="button"
            onClick={() => onSelectMeal(tab.type)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 select-none sm:text-sm',
              isActive
                ? 'bg-background text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
              !tab.available && 'opacity-50',
            )}
          >
            <Icon weight="bold" className="size-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
