'use client'

import {
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Glow } from '@/components/glow'

interface WeekNavigatorProps {
  label?: string // e.g. "Semana de 28/09 a 02/10"
  weekStartDate: string // YYYY-MM-DD
  prevWeekDate: string | null
  nextWeekDate: string | null
  onNavigate: (date: string) => void
  onResetCurrentWeek: () => void
  isCurrentWeek: boolean
  isLoading?: boolean
}

export function WeekNavigator({
  label,
  weekStartDate,
  prevWeekDate,
  nextWeekDate,
  onNavigate,
  onResetCurrentWeek,
  isCurrentWeek,
  isLoading = false,
}: WeekNavigatorProps) {
  const fallbackPrev = () => {
    if (prevWeekDate) {
      onNavigate(prevWeekDate)
      return
    }
    const [y, m, d] = weekStartDate.split('-').map(Number)
    const dt = new Date(y, m - 1, d, 12, 0, 0)
    dt.setDate(dt.getDate() - 7)
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    onNavigate(`${yyyy}-${mm}-${dd}`)
  }

  const fallbackNext = () => {
    if (nextWeekDate) {
      onNavigate(nextWeekDate)
      return
    }
    const [y, m, d] = weekStartDate.split('-').map(Number)
    const dt = new Date(y, m - 1, d, 12, 0, 0)
    dt.setDate(dt.getDate() + 7)
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    onNavigate(`${yyyy}-${mm}-${dd}`)
  }

  return (
    <div className="bg-accent/40 border-border/70 flex w-full items-center justify-between gap-2 rounded-2xl border p-2 shadow-xs backdrop-blur-md">
      {/* Botão Semana Anterior */}
      <button
        type="button"
        onClick={fallbackPrev}
        disabled={isLoading}
        title="Navegar para a semana anterior"
        className={cn(
          'text-foreground hover:bg-accent/80 flex items-center gap-1 rounded-xl p-2 text-xs font-medium transition-all active:scale-95 sm:px-3 sm:py-2',
          isLoading && 'cursor-not-allowed opacity-50',
        )}
      >
        <CaretLeftIcon weight="bold" className="size-4 shrink-0" />
        <span className="hidden sm:inline">Semana anterior</span>
      </button>

      {/* Centro: Título da Semana e Indicador Esta Semana */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground text-sm font-semibold tracking-tight sm:text-base">
              {label || `Semana de ${weekStartDate}`}
            </span>
            {isCurrentWeek && (
              <span className="bg-accent border-border text-foreground/90 relative inline-flex items-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase shadow-2xs select-none">
                <Glow
                  colors="#22d3ee"
                  className="pointer-events-none absolute -left-2 size-6 opacity-90 blur-xs"
                />
                <span className="relative z-10">Esta semana</span>
              </span>
            )}
          </div>
        </div>

        {!isCurrentWeek && (
          <button
            type="button"
            onClick={onResetCurrentWeek}
            disabled={isLoading}
            title="Voltar para a semana atual"
            className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs font-medium transition-all"
          >
            <ArrowCounterClockwiseIcon
              weight="bold"
              className="size-3 shrink-0"
            />
            <span className="hidden md:inline">Esta semana</span>
          </button>
        )}
      </div>

      {/* Botão Próxima Semana */}
      <button
        type="button"
        onClick={fallbackNext}
        disabled={isLoading}
        title="Navegar para a próxima semana"
        className={cn(
          'text-foreground hover:bg-accent/80 flex items-center gap-1 rounded-xl p-2 text-xs font-medium transition-all active:scale-95 sm:px-3 sm:py-2',
          isLoading && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="hidden sm:inline">Próxima semana</span>
        <CaretRightIcon weight="bold" className="size-4 shrink-0" />
      </button>
    </div>
  )
}
