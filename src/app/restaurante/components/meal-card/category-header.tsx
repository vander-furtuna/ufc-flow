import { Glow } from '@/components/glow'
import { cn } from '@/lib/utils'
import type { CategoryHeaderProps } from './types'

export function CategoryHeader({
  title,
  meta,
  isVegetarian: _isVegetarian = false,
  variant = 'hero',
}: CategoryHeaderProps) {
  const Icon = meta.icon
  const isHero = variant === 'hero'

  return (
    <div
      className={cn(
        'mb-3 flex items-center justify-between gap-2',
        !isHero && 'justify-start',
      )}
    >
      <div className="flex items-center gap-2.5">
        {/* Caixa de ícone unificada com Glow */}
        <div
          className={cn(
            'bg-accent relative flex shrink-0 items-center justify-center overflow-hidden shadow-xs',
            isHero ? 'size-10 rounded-lg' : 'size-9 rounded-md',
          )}
        >
          <Icon
            weight="bold"
            className={cn(
              'text-foreground/90 relative z-10',
              isHero ? 'size-5.5' : 'size-5',
            )}
          />
          <Glow
            colors={meta.glowColor}
            className={cn(
              'pointer-events-none absolute -bottom-4 opacity-90 blur-[10px]',
              isHero ? 'size-10' : 'size-9',
            )}
          />
        </div>

        {isHero ? (
          <h4 className="text-foreground text-sm font-semibold sm:text-base">
            {title}
          </h4>
        ) : (
          <h5 className="text-foreground text-xs font-semibold sm:text-sm">
            {title}
          </h5>
        )}
      </div>
    </div>
  )
}
