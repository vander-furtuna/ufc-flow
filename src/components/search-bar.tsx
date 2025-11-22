'use client'

import { BrushCleaning, ListFilter, Search } from 'lucide-react'
import { useState } from 'react'

import { useFilter } from '@/contexts/filter'
import { AnimatePresence, motion } from 'motion/react'
import { Glow } from './glow'
import { Filters } from './filter/filters'

export function SearchBar() {
  const { isFiltersActive, clearAllFilters, queryFilter, changeQueryFilter } =
    useFilter()

  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  return (
    <div className="flex w-full flex-col items-center justify-center gap-1.5 sm:w-fit">
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-accent/40 shadow-foreground/5 border-border relative flex h-fit w-full items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-md"
          >
            <div className="relative flex min-w-0 flex-1">
              <Filters />
            </div>

            {/* área do ícone, largura fixa e não encolhe */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="bg-muted-foreground/50 h-4 w-px" />
              <button
                type="button"
                onClick={clearAllFilters}
                className="transition-all ease-in-out not-disabled:active:scale-90 disabled:opacity-50"
                disabled={!isFiltersActive}
              >
                <BrushCleaning className="text-foreground/90 size-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-border bg-accent/70 relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full border px-4 shadow-lg backdrop-blur-md transition-all">
        <Search className="text-muted-foreground size-6 shrink-0" />

        <input
          onChange={(e) => changeQueryFilter(e.target.value)}
          value={queryFilter}
          type="text"
          className="h-full w-full border-0 bg-transparent text-sm outline-0 transition-all sm:min-w-80"
          placeholder="Pesquisar"
        />
        <div className="bg-muted-foreground/50 h-4 w-px" />
        <button
          type="button"
          onClick={() => setIsFiltersOpen((prev) => !prev)}
          className="transition-all ease-in-out active:scale-90"
        >
          <ListFilter
            data-state={isFiltersActive ? 'active' : 'default'}
            className="text-muted-foreground data-[state=active]:text-accent-foreground size-6"
          />
        </button>

        <Glow
          data-state={isFiltersActive ? 'active' : 'inactive'}
          className="absolute -right-8 -z-1 size-16 opacity-0 blur-lg transition-all data-[state=active]:-right-4 data-[state=active]:opacity-100"
          colors="#22d3ee"
        />
      </div>
    </div>
  )
}
