'use client'

import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  CalendarXIcon,
} from '@phosphor-icons/react'
import { Glow } from '@/components/glow'

interface RuEmptyStateProps {
  message?: string | null
  nextDate?: string | null
  nextLabel?: string | null
  onNavigateNext?: () => void
  onResetToday?: () => void
  isToday?: boolean
}

export function RuEmptyState({
  message,
  nextDate,
  nextLabel,
  onNavigateNext,
  onResetToday,
  isToday = false,
}: RuEmptyStateProps) {
  return (
    <div className="ssm:p-14 flex h-full w-full flex-col items-center justify-center text-center">
      <div className="relative mb-4 flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-border bg-accent text-foreground/90 shadow-xs">
        <Glow
          colors="#22d3ee"
          className="pointer-events-none absolute -bottom-4 size-12 opacity-75 blur-sm"
        />
        <CalendarXIcon weight="bold" className="relative z-10 size-7" />
      </div>

      <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        Nenhum cardápio disponível para este dia
      </h3>

      <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {message ||
          'A publicação do cardápio poderá ser feita posteriormente pela nutricionista responsável ou não há expediente no restaurante universitário nesta data (finais de semana ou feriados).'}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {nextDate && onNavigateNext && (
          <button
            type="button"
            onClick={onNavigateNext}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-95 sm:text-sm"
          >
            <span>Ver {nextLabel || 'Próximo dia disponível'}</span>
            <ArrowRightIcon weight="bold" className="size-4" />
          </button>
        )}

        {!isToday && onResetToday && (
          <button
            type="button"
            onClick={onResetToday}
            className="flex items-center gap-2 rounded-xl border border-border bg-accent/80 px-4 py-2 text-xs font-medium text-foreground transition-all hover:bg-accent active:scale-95 sm:text-sm"
          >
            <ArrowCounterClockwiseIcon weight="bold" className="size-3.5" />
            <span>Voltar para hoje</span>
          </button>
        )}
      </div>
    </div>
  )
}
