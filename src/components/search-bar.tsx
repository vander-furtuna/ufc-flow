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
    <div className="justify-centerw flex h-12 w-full items-center rounded-md border border-border bg-accent/50 pl-4 shadow-lg shadow-foreground/5 backdrop-blur-md transition-all sm:w-fit dark:border-slate-700">
      <input
        onChange={(e) => setQueryFilter(e.target.value)}
        value={filters.query}
        type="text"
        className="h-full w-full border-0 bg-transparent text-sm outline-0 sm:w-56"
        placeholder="Pesquisar"
      />

      {/* <AnimatePresence>{isFiltersOpen && <Filters />}</AnimatePresence> */}
      <Filters isOpen={isFiltersOpen} />

      <button
        className="size-6 flex-shrink-0 rounded-md text-muted-foreground transition-colors center data-[active=active]:bg-slate-400 data-[open=open]:bg-slate-200 data-[active=active]:text-slate-100 dark:data-[active=active]:bg-slate-400 dark:data-[open=open]:bg-slate-700 dark:data-[active=active]:text-slate-700"
        data-active={isFiltersActive ? 'active' : 'inactive'}
        data-open={isFiltersOpen && !isFiltersActive ? 'open' : 'closed'}
        onClick={() => setIsFiltersOpen((prev) => !prev)}
      >
        <Settings2 className="size-4" />
      </button>

      <button className="h-full w-12 flex-shrink-0 center">
        <Search className="size-6 text-muted-foreground" />
      </button>
    </div>
  )
}
