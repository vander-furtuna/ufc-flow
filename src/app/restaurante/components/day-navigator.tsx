'use client'

import {
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Glow } from '@/components/glow'

interface DayNavigatorProps {
  currentDate: string // YYYY-MM-DD
  currentLabel?: string // e.g. "Sexta (25/09)"
  prevDate: string | null
  prevLabel: string | null
  nextDate: string | null
  nextLabel: string | null
  onNavigate: (date: string) => void
  onResetToday: () => void
  isToday: boolean
  isLoading?: boolean
}

export function DayNavigator({
  currentDate,
  currentLabel,
  prevDate,
  prevLabel,
  nextDate,
  nextLabel,
  onNavigate,
  onResetToday,
  isToday,
  isLoading = false,
}: DayNavigatorProps) {
  // Se não houver prevDate da API (ou for igual à data atual), calcula um dia antes (pulando fins de semana)
  const fallbackPrev = () => {
    if (prevDate && prevDate !== currentDate) {
      onNavigate(prevDate)
      return
    }
    const d = new Date(currentDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    if (d.getDay() === 0) d.setDate(d.getDate() - 2) // se domingo, volta para sexta
    if (d.getDay() === 6) d.setDate(d.getDate() - 1) // se sábado, volta para sexta
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    onNavigate(`${yyyy}-${mm}-${dd}`)
  }

  // Se não houver nextDate da API (ou for igual à data atual), calcula um dia depois (pulando fins de semana)
  const fallbackNext = () => {
    if (nextDate && nextDate !== currentDate) {
      onNavigate(nextDate)
      return
    }
    const d = new Date(currentDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    if (d.getDay() === 6) d.setDate(d.getDate() + 2) // se sábado, pula para segunda
    if (d.getDay() === 0) d.setDate(d.getDate() + 1) // se domingo, pula para segunda
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    onNavigate(`${yyyy}-${mm}-${dd}`)
  }

  // Formatação amigável se o currentLabel não vier
  const displayLabel = () => {
    if (currentLabel) return currentLabel
    try {
      const d = new Date(currentDate + 'T12:00:00')
      return d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      })
    } catch {
      return currentDate
    }
  }

  return (
    <div className="bg-accent/40 border-border/70 flex w-full items-center justify-between gap-2 rounded-2xl border p-2 shadow-xs backdrop-blur-md">
      {/* Botão Anterior */}
      <button
        type="button"
        onClick={fallbackPrev}
        disabled={isLoading}
        title={prevLabel ? `Dia anterior: ${prevLabel}` : 'Dia anterior'}
        className={cn(
          'text-foreground hover:bg-accent/80 flex items-center gap-1 rounded-xl p-2 text-xs font-medium transition-all active:scale-95 sm:px-3 sm:py-2',
          isLoading && 'cursor-not-allowed opacity-50',
        )}
      >
        <CaretLeftIcon weight="bold" className="size-4 shrink-0" />
        <span className="hidden max-w-[110px] truncate sm:inline">
          {prevLabel || 'Anterior'}
        </span>
      </button>

      {/* Centro: Data Atual e Botão Hoje */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground text-sm font-semibold tracking-tight capitalize sm:text-base">
              {displayLabel()}
            </span>
            {isToday && (
              <span className="bg-accent border-border text-foreground/90 relative inline-flex items-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase shadow-2xs select-none">
                <Glow
                  colors="#22d3ee"
                  className="pointer-events-none absolute -left-2 size-6 opacity-90 blur-xs"
                />
                <span className="relative z-10">Hoje</span>
              </span>
            )}
          </div>
        </div>

        {!isToday && (
          <button
            type="button"
            onClick={onResetToday}
            disabled={isLoading}
            title="Voltar para o cardápio de hoje"
            className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs font-medium transition-all"
          >
            <ArrowCounterClockwiseIcon
              weight="bold"
              className="size-3 shrink-0"
            />
            <span className="hidden md:inline">Hoje</span>
          </button>
        )}
      </div>

      {/* Botão Próximo */}
      <button
        type="button"
        onClick={fallbackNext}
        disabled={isLoading}
        title={
          nextLabel && nextDate !== currentDate
            ? `Próximo dia: ${nextLabel}`
            : 'Próximo dia'
        }
        className={cn(
          'text-foreground hover:bg-accent/80 flex items-center gap-1 rounded-xl p-2 text-xs font-medium transition-all active:scale-95 sm:px-3 sm:py-2',
          isLoading && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="hidden max-w-[110px] truncate sm:inline">
          {nextDate && nextDate !== currentDate
            ? nextLabel || 'Próximo'
            : 'Próximo'}
        </span>
        <CaretRightIcon weight="bold" className="size-4 shrink-0" />
      </button>
    </div>
  )
}
