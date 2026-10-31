'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ComponentType,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import {
  DropIcon,
  GrainsIcon,
  LeafIcon,
  type IconProps,
} from '@phosphor-icons/react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Glow } from '@/components/glow'
import { cn } from '@/lib/utils'

export type DietaryType = 'gluten' | 'lactose' | 'vegetarian'

export interface DietaryItemConfig {
  type: DietaryType
  title: string
  label: string
  filterLabel?: string
  icon: ComponentType<IconProps>
  color: string
}

export const DIETARY_ITEMS: DietaryItemConfig[] = [
  {
    type: 'vegetarian',
    title: 'Opção Vegetariana',
    label: 'Vegetariano',
    filterLabel: 'Vegetariano',
    icon: LeafIcon,
    color: '#10b981',
  },
  {
    type: 'gluten',
    title: 'Contém Glúten',
    label: 'Glúten',
    filterLabel: 'Sem Glúten',
    icon: GrainsIcon,
    color: '#f59e0b',
  },
  {
    type: 'lactose',
    title: 'Contém Lactose',
    label: 'Lactose',
    filterLabel: 'Sem Lactose',
    icon: DropIcon,
    color: '#06b6d4',
  },
]

export const DIETARY_ITEMS_MAP: Record<DietaryType, DietaryItemConfig> =
  DIETARY_ITEMS.reduce(
    (acc, item) => {
      acc[item.type] = item
      return acc
    },
    {} as Record<DietaryType, DietaryItemConfig>,
  )

export function getDietaryItem(
  type: DietaryType,
): DietaryItemConfig | undefined {
  return DIETARY_ITEMS_MAP[type]
}

export interface DietaryBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Tipo pré-configurado da badge */
  type?: DietaryType
  /** Ou objeto de configuração completo */
  item?: DietaryItemConfig
  /** Sobrescrita do título/tooltip */
  title?: string
  /** Sobrescrita do label textual visível */
  label?: string
  /** Sobrescrita do ícone */
  icon?: ComponentType<IconProps>
  /** Sobrescrita da cor do Glow */
  color?: string
  /** Oculta o label de texto, exibindo apenas o ícone com Glow e tooltip */
  compact?: boolean
  /** Classes CSS adicionais */
  className?: string
}

export function DietaryBadge({
  type,
  item: itemProp,
  title: titleProp,
  label: labelProp,
  icon: IconProp,
  color: colorProp,
  compact = false,
  className,
  ...props
}: DietaryBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isPinnedRef = useRef(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const resolvedItem = itemProp ?? (type ? DIETARY_ITEMS_MAP[type] : undefined)
  const Icon = IconProp ?? resolvedItem?.icon

  const title = titleProp ?? resolvedItem?.title
  const label = labelProp ?? resolvedItem?.label
  const color = colorProp ?? resolvedItem?.color

  // Limpa o timer de hover ao desmontar
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const handlePointerEnter = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true)
    }, 120)
  }

  const handlePointerLeave = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') return
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    // Não fecha se o tooltip foi fixado via clique
    if (!isPinnedRef.current) {
      setIsOpen(false)
    }
  }

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    if (isPinnedRef.current) {
      // Já estava fixado pelo clique -> desativa e fecha
      isPinnedRef.current = false
      setIsOpen(false)
    } else {
      // Primeiro clique (mesmo se o hover já tivesse aberto!) -> fixa e mantém aberto
      isPinnedRef.current = true
      setIsOpen(true)
    }
  }

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      isPinnedRef.current = false
      setIsOpen(false)
    } else {
      setIsOpen(true)
    }
  }, [])

  if (!Icon) return null

  const tooltipText = title || label || ''

  // Quando compact: exibe apenas o ícone e surge o tooltip ao clicar (ou passar o mouse)
  if (compact) {
    return (
      <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            onClick={handleClick}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            aria-label={tooltipText}
            className={cn(
              'bg-accent border-border text-foreground/90 hover:bg-accent/90 hover:border-foreground/30 relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-md border p-1 text-[11px] font-medium shadow-2xs transition-all select-none active:scale-90',
              isOpen && 'ring-primary/40 ring-1',
              className,
            )}
          >
            {color && (
              <Glow
                colors={color}
                className="pointer-events-none absolute -left-2.5 size-7 opacity-90 blur-xs"
              />
            )}
            <Icon
              weight="bold"
              className="text-foreground/90 relative z-10 size-3.5 shrink-0"
            />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="top"
            align="center"
            sideOffset={6}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => {
              if (triggerRef.current?.contains(e.target as Node)) {
                e.preventDefault()
              }
            }}
            className={cn(
              'bg-popover/95 border-border/80 text-foreground pointer-events-none z-900 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-md backdrop-blur-md select-none',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
            )}
          >
            {color && (
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
            <span>{tooltipText}</span>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  }

  // Versão padrão expandida com ícone e texto
  return (
    <span
      title={title}
      className={cn(
        'bg-accent border-border text-foreground/90 relative inline-flex items-center gap-1 overflow-hidden rounded-md border px-1.5 py-0.5 text-[11px] font-medium shadow-2xs transition-all select-none',
        className,
      )}
      {...props}
    >
      {color && (
        <Glow
          colors={color}
          className="pointer-events-none absolute -left-2.5 size-8 opacity-90 blur-md"
        />
      )}
      <Icon
        weight="bold"
        className="text-foreground/90 relative z-10 size-4 shrink-0"
      />
      {label && <span className="relative z-10 font-medium">{label}</span>}
    </span>
  )
}
