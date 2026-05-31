'use client'

import { BrushCleaning, ListFilter, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { useFilter } from '@/contexts/filter'
import { AnimatePresence, motion } from 'motion/react'
import { Glow } from './glow'
import { Filters } from './filter/filters'
import { useTools } from '@/contexts/tools'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { navItems } from '@/config/nav-items'

type ToolBarProps = {
  children: ReactNode
}

function ToolBar({ children }: ToolBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
      className="bg-accent/40 shadow-foreground/5 border-border absolute bottom-14 flex h-fit w-full items-center gap-1.5 rounded-full border px-3 py-2 backdrop-blur-md"
    >
      {children}
    </motion.div>
  )
}

export function SearchBar() {
  const pathname = usePathname()

  const { resetTools } = useTools()
  const { isFiltersActive, clearAllFilters, queryFilter, changeQueryFilter } =
    useFilter()

  const [optionsMode, setOptionsMode] = useState<'filters' | 'nav' | 'closed'>(
    'closed',
  )

  const handleSelectMode = (mode: 'filters' | 'nav' | 'closed') => {
    setOptionsMode((prev) => (prev === mode ? 'closed' : mode))
  }

  const currentNavItem = navItems.find((item) => {
    return item.href(pathname) === pathname
  })

  const othersNavItems = navItems.filter(
    (item) => item.id !== currentNavItem?.id,
  )

  return (
    <div className="relative flex w-full flex-col items-center justify-center gap-2 sm:w-md">
      <AnimatePresence>
        {optionsMode === 'filters' && (
          <ToolBar>
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
          </ToolBar>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {optionsMode === 'nav' && (
          <div className="absolute bottom-16 left-0 flex flex-col gap-2">
            {othersNavItems.map((item, index) => (
              <Link key={item.id} href={item.href(pathname)}>
                <motion.button
                  type="button"
                  className="flex items-center gap-1"
                >
                  <motion.div
                    className="border-border bg-accent/70 text-foreground/90 hover:text-foreground group/nav relative flex size-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full border px-3 shadow-lg backdrop-blur-md transition-colors"
                    initial={{ opacity: 0, x: -10, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -10, filter: 'blur(10px)' }}
                    transition={{
                      duration: 0.2,
                      delay: (navItems.length - index) * 0.1,
                    }}
                  >
                    {item.icon}
                    <Glow
                      className="absolute -left-8 -z-1 size-16 opacity-0 blur-lg transition-all group-hover/nav:-left-4 group-hover/nav:opacity-50"
                      colors="#22d3ee"
                    />
                  </motion.div>
                  <motion.span
                    className="bg-accent/50 rounded-full border px-2 py-0.5 text-nowrap backdrop-blur-md"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{
                      duration: 0.2,
                      delay: (navItems.length - index) * 0.1 + 0.1,
                    }}
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              </Link>
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="flex w-full gap-1">
        <div className="border-border bg-accent/70 flex w-fit shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-lg backdrop-blur-md">
          <button
            className="text-foreground/90 relative flex size-12 shrink-0 items-center justify-center transition-all"
            onClick={() => handleSelectMode('nav')}
            data-state={optionsMode === 'nav' ? 'active' : 'default'}
          >
            {currentNavItem && currentNavItem.icon}
            <Glow
              data-state={optionsMode === 'nav' ? 'active' : 'default'}
              className="absolute -left-8 -z-1 size-16 opacity-0 blur-lg transition-all data-[state=active]:-left-4 data-[state=active]:opacity-100"
              colors="#22d3ee"
            />
          </button>
        </div>
        <div className="border-border bg-accent/70 relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full border px-3 shadow-lg backdrop-blur-md transition-all">
          <Search className="text-muted-foreground size-6 shrink-0" />

          <input
            onChange={(e) => changeQueryFilter(e.target.value)}
            value={queryFilter}
            type="text"
            className="h-full w-full border-0 bg-transparent text-sm outline-0 transition-all"
            placeholder="Pesquisar"
          />
          <div className="bg-muted-foreground/50 h-4 w-px" />
          <button
            type="button"
            onClick={() => handleSelectMode('filters')}
            className="transition-all ease-in-out active:scale-90"
          >
            <ListFilter
              data-state={
                isFiltersActive || optionsMode === 'filters'
                  ? 'active'
                  : 'default'
              }
              className="text-accent-foreground/80 data-[state=active]:text-accent-foreground size-6"
            />
          </button>

          <Glow
            data-state={isFiltersActive ? 'active' : 'inactive'}
            className="absolute -right-8 -z-1 size-16 opacity-0 blur-lg transition-all data-[state=active]:-right-4 data-[state=active]:opacity-100"
            colors="#22d3ee"
          />
        </div>
      </div>
    </div>
  )
}
