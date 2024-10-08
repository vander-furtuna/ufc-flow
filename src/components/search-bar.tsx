import { AnimatePresence } from 'framer-motion'
import { Search, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCourse } from '@/app/contexts/course'

import { Filters } from './filter/filters'

export function SearchBar() {
  const { filters, setQueryFilter } = useCourse()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const isFiltersActive = useMemo(
    () =>
      filters.query !== '' ||
      filters.branch.length > 0 ||
      filters.semester.length > 0 ||
      filters.nature.length > 0 ||
      filters.duration.length > 0,
    [filters],
  )

  return (
    <div className="flex items-center justify-centerw w-fit h-12 bg-accent rounded-md transition-all border border-border dark:border-slate-700 pl-4">
      <input
        onChange={(e) => setQueryFilter(e.target.value)}
        value={filters.query}
        type="text"
        className="h-full bg-transparent text-sm outline-0 border-0 w-56"
        placeholder="Pesquisar"
      />

      <AnimatePresence>{isFiltersOpen && <Filters />}</AnimatePresence>

      <button
        className="center data-[open=open]:bg-slate-200 dark:data-[open=open]:bg-slate-700 size-6 rounded-md data-[active=active]:bg-slate-400 dark:data-[active=active]:bg-slate-400 dark:data-[active=active]:text-slate-700 text-muted-foreground data-[active=active]:text-slate-100 transition-colors"
        data-active={isFiltersActive ? 'active' : 'inactive'}
        onClick={() => setIsFiltersOpen((prev) => !prev)}
      >
        <Settings2 className="size-4 " />
      </button>

      <button className="h-full w-12 center">
        <Search className="text-muted-foreground size-6" />
      </button>
    </div>
  )
}
