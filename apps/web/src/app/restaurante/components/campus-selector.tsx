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
            'group flex items-center gap-2 rounded-full border border-border/80 bg-accent/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-xs backdrop-blur-md transition-all hover:bg-accent/80 active:scale-98 sm:text-sm',
            disabled && 'cursor-not-allowed opacity-60',
          )}
          aria-label="Selecionar campus do Restaurante Universitário"
        >
          <MapPinIcon
            weight="bold"
            className="size-4 shrink-0 text-primary transition-transform group-hover:scale-110"
          />
          <span className="hidden max-w-32.5 truncate font-medium tracking-tight sm:inline-block sm:max-w-none">
            {currentCampus.name}
          </span>
          <CaretDownIcon
            weight="bold"
            className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold text-muted-foreground">
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
                isSelected && 'bg-primary/10 font-medium text-primary',
              )}
            >
              <div className="flex flex-col">
                <span className="leading-none font-medium">{campus.name}</span>
                {campus.units && (
                  <span className="mt-1 text-[11px] leading-tight text-muted-foreground">
                    {campus.units.join(' • ')}
                  </span>
                )}
              </div>

              {isSelected && (
                <CheckIcon
                  weight="bold"
                  className="ml-2 size-4 shrink-0 text-primary"
                />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
