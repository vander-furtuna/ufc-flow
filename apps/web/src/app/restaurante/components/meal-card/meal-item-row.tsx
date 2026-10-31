import type { MealItemRowProps } from './types'
import { DietaryBadge } from '../dietary-badge'

export function MealItemRow({ item, variant = 'hero' }: MealItemRowProps) {
  const isHero = variant === 'hero'

  if (isHero) {
    return (
      <li className="flex flex-col justify-between gap-1.5 rounded-lg border border-border/40 bg-background/50 p-2.5 sm:flex-row sm:items-center">
        <span className="text-sm leading-snug font-medium text-foreground">
          {item.name}
        </span>

        <div className="flex shrink-0 items-center gap-1 empty:hidden">
          {item.hasGluten && <DietaryBadge type="gluten" />}
          {item.hasLactose && <DietaryBadge type="lactose" />}
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between gap-2 border-b border-border/30 py-1 text-xs last:border-b-0">
      <span className="text-sm font-medium text-foreground/90">
        {item.name}
      </span>

      <div className="flex shrink-0 items-center gap-1 empty:hidden">
        {item.hasGluten && <DietaryBadge type="gluten" compact />}
        {item.hasLactose && <DietaryBadge type="lactose" compact />}
      </div>
    </li>
  )
}
