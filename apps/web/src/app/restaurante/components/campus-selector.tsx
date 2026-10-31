'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UFC_CAMPUSES, type CampusId } from '@/types/ru'
import { CaretDownIcon, CheckIcon, MapPinIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface CampusSelectorProps {
  selectedCampusId: CampusId
  onSelectCampus: (id: CampusId) => void
  disabled?: boolean
}

export function CampusSelector({
  selectedCampusId,
  onSelectCampus,
  disabled = false,
}: CampusSelectorProps) {
  const currentCampus =
    UFC_CAMPUSES.find((c) => c.id === selectedCampusId) || UFC_CAMPUSES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'group bg-accent/60 hover:bg-accent/80 border-border/80 text-foreground flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-xs backdrop-blur-md transition-all active:scale-98 sm:text-sm',
            disabled && 'cursor-not-allowed opacity-60',
          )}
          aria-label="Selecionar campus do Restaurante Universitário"
        >
          <MapPinIcon
            weight="bold"
            className="text-primary size-4 shrink-0 transition-transform group-hover:scale-110"
          />
          <span className="hidden max-w-32.5 truncate font-medium tracking-tight sm:inline-block sm:max-w-none">
            {currentCampus.name}
          </span>
          <CaretDownIcon
            weight="bold"
            className="text-muted-foreground size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-xs font-semibold">
          Selecione o Campus do RU
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {UFC_CAMPUSES.map((campus) => {
          const isSelected = campus.id === selectedCampusId

          return (
            <DropdownMenuItem
              key={campus.id}
              onClick={() => onSelectCampus(campus.id)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-xs transition-colors sm:text-sm',
                isSelected && 'bg-primary/10 text-primary font-medium',
              )}
            >
              <div className="flex flex-col">
                <span className="leading-none font-medium">{campus.name}</span>
                {campus.units && (
                  <span className="text-muted-foreground mt-1 text-[11px] leading-tight">
                    {campus.units.join(' • ')}
                  </span>
                )}
              </div>

              {isSelected && (
                <CheckIcon
                  weight="bold"
                  className="text-primary ml-2 size-4 shrink-0"
                />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
