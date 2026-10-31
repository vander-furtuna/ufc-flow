'use client'

import {
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useState, useRef, useEffect, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import { Glow } from './glow'
import { ToolBar } from './toolbar'
import { NavMenu } from './nav-menu'
import { cn } from '@/lib/utils'

export type AppSearchBarProps = {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  baseHref?: string
  currentNavId?: string
  isFilterActive?: boolean
  filterIcon?: ReactNode
  filterToolbar?: ReactNode
  onFilterClick?: () => void
  className?: string
  glowColor?: string
}

export function AppSearchBar({
  placeholder = 'Pesquisar',
  value,
  onChange,
  onClear,
  baseHref,
  currentNavId,
  isFilterActive = false,
  filterIcon,
  filterToolbar,
  onFilterClick,
  className,
  glowColor = '#22d3ee',
}: AppSearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [optionsMode, setOptionsMode] = useState<'filters' | 'nav' | 'closed'>(
    'closed',
  )

  const handleSelectMode = (mode: 'filters' | 'nav' | 'closed') => {
    setOptionsMode((prev) => (prev === mode ? 'closed' : mode))
  }

  // Fecha menus ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOptionsMode('closed')
      }
    }

    if (optionsMode !== 'closed') {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [optionsMode])

  const hasFilter = Boolean(filterToolbar || onFilterClick)

  const handleFilterButtonClick = () => {
    if (onFilterClick && !filterToolbar) {
      onFilterClick()
    } else {
      handleSelectMode('filters')
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex w-full flex-col items-center justify-center gap-2 sm:w-md',
        className,
      )}
    >
      {/* Toolbar Flutuante de Filtros */}
      <AnimatePresence>
        {optionsMode === 'filters' && filterToolbar && (
          <ToolBar>{filterToolbar}</ToolBar>
        )}
      </AnimatePresence>

      {/* Barra Principal: Botão de Navegação + Barra de Pesquisa */}
      <div className="flex w-full gap-1">
        {/* Menu de Navegação Modularizado */}
        <NavMenu
          baseHref={baseHref}
          currentNavId={currentNavId}
          isOpen={optionsMode === 'nav'}
          onOpenChange={(open) => setOptionsMode(open ? 'nav' : 'closed')}
          onSelect={() => setOptionsMode('closed')}
        />

        {/* Pílula de Pesquisa */}
        <div className="border-border bg-accent/70 relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full border px-3 shadow-lg backdrop-blur-md transition-all">
          <MagnifyingGlassIcon
            weight="bold"
            className="text-muted-foreground size-5 shrink-0 sm:size-6"
          />

          <input
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (optionsMode === 'nav') {
                setOptionsMode('closed')
              }
            }}
            value={value}
            type="text"
            className="placeholder:text-muted-foreground/70 h-full w-full border-0 bg-transparent text-sm outline-hidden transition-all"
            placeholder={placeholder}
          />

          {value.length > 0 && onClear && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-90"
              onClick={onClear}
              aria-label="Limpar pesquisa"
            >
              <XIcon weight="bold" className="size-4" />
            </button>
          )}

          {hasFilter && (
            <>
              <div className="bg-muted-foreground/50 h-4 w-px shrink-0" />
              <button
                type="button"
                onClick={handleFilterButtonClick}
                className="text-accent-foreground/80 hover:text-accent-foreground cursor-pointer transition-all ease-in-out active:scale-90"
                aria-label="Opções de filtro"
              >
                {filterIcon || (
                  <FunnelSimpleIcon
                    weight="bold"
                    data-state={
                      isFilterActive || optionsMode === 'filters'
                        ? 'active'
                        : 'default'
                    }
                    className="data-[state=active]:text-foreground size-5 sm:size-6"
                  />
                )}
              </button>

              <Glow
                data-state={isFilterActive ? 'active' : 'inactive'}
                className="absolute -right-8 -z-1 size-16 opacity-0 blur-lg transition-all data-[state=active]:-right-4 data-[state=active]:opacity-100"
                colors={glowColor}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export { ToolBar } from './toolbar'
export { NavMenu } from './nav-menu'
