'use client'

import type { Icon } from '@phosphor-icons/react'
import { type KeyboardEvent, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface ViewSwitcherOption<T extends string> {
  value: T
  label: string
  icon?: Icon
  title?: string
}

interface ViewSwitcherProps<T extends string> {
  options: ViewSwitcherOption<T>[]
  value: T
  onValueChange: (value: T) => void
  ariaLabel: string
  disabled?: boolean
  className?: string
}

/**
 * Seletor de "abas" usado nos headers para alternar o modo de visualização
 * da página (ex: Dia/Semana no RU, Lista/Calendário no calendário acadêmico).
 */
export function ViewSwitcher<T extends string>({
  options,
  value,
  onValueChange,
  ariaLabel,
  disabled = false,
  className,
}: ViewSwitcherProps<T>) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])

  // Navegação por setas entre as abas, conforme o padrão WAI-ARIA de tablist
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = options.findIndex((o) => o.value === value)
    let nextIndex: number

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % options.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + options.length) % options.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = options.length - 1
    } else {
      return
    }

    event.preventDefault()
    onValueChange(options[nextIndex].value)
    tabsRef.current[nextIndex]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'bg-muted/70 border-border/60 flex items-center rounded-xl border p-1 backdrop-blur-sm',
        className,
      )}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value
        const OptionIcon = option.icon

        return (
          <button
            key={option.value}
            ref={(el) => {
              tabsRef.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all select-none sm:px-3 sm:text-sm',
              isSelected
                ? 'bg-background text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            title={option.title}
          >
            {OptionIcon && (
              <OptionIcon weight="bold" className="size-3.5 sm:size-4" />
            )}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
