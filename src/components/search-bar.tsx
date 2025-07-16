import { Search, Settings2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { useFilter } from '@/contexts/filter'

import { Filters } from './filter/filters'

export function SearchBar() {
  const { isFiltersActive, clearAllFilters, queryFilter, changeQueryFilter } =
    useFilter()

  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  return (
    <div className="justify-centerw border-border bg-accent/50 shadow-foreground/5 flex h-12 w-full items-center rounded-md border pl-4 shadow-lg backdrop-blur-md transition-all sm:w-fit dark:border-slate-700">
      <input
        onChange={(e) => changeQueryFilter(e.target.value)}
        value={queryFilter}
        type="text"
        className="h-full w-full border-0 bg-transparent text-sm outline-0 sm:w-72"
        placeholder="Pesquisar"
      />

      {/* <AnimatePresence>{isFiltersOpen && <Filters />}</AnimatePresence> */}
      <Filters isOpen={isFiltersOpen} />

      <button
        className="text-muted-foreground center size-6 shrink-0 rounded-md transition-colors data-[active=active]:bg-slate-400 data-[active=active]:text-slate-100 data-[open=open]:bg-slate-200 dark:data-[active=active]:bg-slate-400 dark:data-[active=active]:text-slate-700 dark:data-[open=open]:bg-slate-700"
        data-active={isFiltersActive ? 'active' : 'inactive'}
        data-open={isFiltersOpen && !isFiltersActive ? 'open' : 'closed'}
        onClick={() => setIsFiltersOpen((prev) => !prev)}
      >
        <Settings2 className="size-4" />
      </button>
      <AnimatePresence>
        {isFiltersActive && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="center ml-2 size-6 shrink-0 rounded-md bg-slate-400 text-slate-100 dark:text-slate-700"
            data-active={isFiltersActive ? 'active' : 'inactive'}
            onClick={clearAllFilters}
          >
            <X className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <button className="center h-full w-12 shrink-0">
        <Search className="text-muted-foreground size-6" />
      </button>
    </div>
  )
}
