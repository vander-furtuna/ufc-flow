'use client'

import {
  Bolt,
  BrushCleaning,
  ListFilter,
  RotateCcw,
  Search,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { useFilter } from '@/contexts/filter'
import { AnimatePresence, motion } from 'motion/react'
import { Glow } from './glow'
import { Filters } from './filter/filters'
import { Tools } from './tools/tools'
import { useTools } from '@/contexts/tools'

type ToolBarProps = {
  children: ReactNode
}

function ToolBar({ children }: ToolBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="bg-accent/40 shadow-foreground/5 border-border absolute bottom-14 flex h-fit w-full items-center gap-1.5 rounded-full border px-3 py-2 backdrop-blur-md"
    >
      {children}
    </motion.div>
  )
}

export function SearchBar() {
  const { resetTools } = useTools()
  const { isFiltersActive, clearAllFilters, queryFilter, changeQueryFilter } =
    useFilter()

  const [optionsMode, setOptionsMode] = useState<
    'filters' | 'config' | 'closed'
  >('closed')

  const handleSelectMode = (mode: 'filters' | 'config' | 'closed') => {
    setOptionsMode((prev) => (prev === mode ? 'closed' : mode))
  }

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
        {optionsMode === 'config' && (
          <ToolBar>
            <div className="relative flex min-w-0 flex-1">
              <Tools />
            </div>

            {/* área do ícone, largura fixa e não encolhe */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="bg-muted-foreground/50 h-4 w-px" />
              <button
                type="button"
                onClick={resetTools}
                className="cursor-pointer transition-all ease-in-out active:scale-90"
              >
                <RotateCcw className="text-foreground/90 size-5" />
              </button>
            </div>
          </ToolBar>
        )}
      </AnimatePresence>

      <div className="flex w-full gap-1">
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
              className="text-muted-foreground data-[state=active]:text-accent-foreground size-6"
            />
          </button>

          <Glow
            data-state={isFiltersActive ? 'active' : 'inactive'}
            className="absolute -right-8 -z-1 size-16 opacity-0 blur-lg transition-all data-[state=active]:-right-4 data-[state=active]:opacity-100"
            colors="#22d3ee"
          />
        </div>

        <button
          className="border-border bg-accent/70 group/tools relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-lg backdrop-blur-md transition-all"
          onClick={() => handleSelectMode('config')}
          data-state={optionsMode === 'config' ? 'active' : 'default'}
        >
          <Bolt className="text-muted-foreground group-data-[state=active]/tools:text-accent-foreground size-6 transition-all duration-300 group-data-[state=active]/tools:rotate-30" />
        </button>
      </div>
    </div>
  )
}
