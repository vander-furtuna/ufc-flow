'use client'

import { useMemo } from 'react'
import { DIETARY_ITEMS, type DietaryType } from './dietary-badge'
import { Glow } from '@/components/glow'
import { useHorizontalScrollWithOverlay } from '@/hooks/use-horizontal-scroll-with-overlay'
import { cn } from '@/lib/utils'

export interface DietaryFiltersProps {
  onlyVegetarian?: boolean
  glutenFree?: boolean
  lactoseFree?: boolean
  isDietaryActive?: (type: DietaryType) => boolean
  onToggleFilter: (type: DietaryType) => void
  className?: string
}

export function DietaryFilters({
  onlyVegetarian = false,
  glutenFree = false,
  lactoseFree = false,
  isDietaryActive,
  onToggleFilter,
  className,
}: DietaryFiltersProps) {
  const { scrollRef, showLeftShadow, showRightShadow } =
    useHorizontalScrollWithOverlay<HTMLDivElement>()

  const maskStyles = useMemo(() => {
    const gradient = `linear-gradient(to right, rgba(0, 0, 0, 0) ${showLeftShadow ? '2%' : '0%'}, rgba(0, 0, 0, 1) ${showLeftShadow ? '10%' : '0%'}, rgba(0, 0, 0, 1) ${showRightShadow ? '90%' : '100%'}, rgba(0, 0, 0, 0) ${showRightShadow ? '98%' : '100%'})`
    return {
      maskImage: gradient,
      WebkitMaskImage: gradient,
    }
  }, [showLeftShadow, showRightShadow])

  const checkActive = (type: DietaryType) => {
    if (isDietaryActive) return isDietaryActive(type)
    if (type === 'vegetarian') return Boolean(onlyVegetarian)
    if (type === 'gluten') return Boolean(glutenFree)
    if (type === 'lactose') return Boolean(lactoseFree)
    return false
  }

  return (
    <div
      className={cn(
        'no-scrollbar relative flex w-full items-center gap-1.5 overflow-x-auto py-0.5',
        className,
      )}
      ref={scrollRef}
      style={maskStyles}
    >
      {DIETARY_ITEMS.map((item) => {
        const isActive = checkActive(item.type)
        const Icon = item.icon

        return (
          <button
            key={item.type}
            type="button"
            onClick={() => onToggleFilter(item.type)}
            data-state={isActive ? 'active' : 'inactive'}
            className="bg-accent border-border text-foreground/90 group/filter data-[state=active]:border-foreground/30 data-[state=active]:bg-accent/80 relative flex shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1 text-xs font-medium text-nowrap shadow-2xs transition-all select-none"
          >
            <Glow
              colors={item.color}
              data-state={isActive ? 'active' : 'inactive'}
              className="pointer-events-none absolute -left-2 size-8 opacity-0 blur-xs transition-all data-[state=active]:opacity-90"
            />
            <Icon weight="bold" className="relative z-10 size-3 shrink-0" />
            <span className="relative z-10">
              {item.filterLabel || item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
