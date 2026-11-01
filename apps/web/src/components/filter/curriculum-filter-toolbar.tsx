'use client'

import { BroomIcon } from '@phosphor-icons/react'
import { useFilter } from '@/contexts/filter'
import { Filters } from './filters'

export function CurriculumFilterToolbar() {
  const { isFiltersActive, clearAllFilters } = useFilter()

  return (
    <>
      <div className="relative flex min-w-0 flex-1">
        <Filters />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="h-4 w-px bg-muted-foreground/50" />
        <button
          type="button"
          onClick={clearAllFilters}
          className="cursor-pointer transition-all ease-in-out not-disabled:active:scale-90 disabled:opacity-50"
          disabled={!isFiltersActive}
          aria-label="Limpar todos os filtros"
        >
          <BroomIcon weight="bold" className="size-5 text-foreground/90" />
        </button>
      </div>
    </>
  )
}
