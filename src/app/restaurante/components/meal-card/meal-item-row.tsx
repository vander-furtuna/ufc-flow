import type { MealItemRowProps } from './types'
import { DietaryBadge } from '../dietary-badge'

export function MealItemRow({ item, variant = 'hero' }: MealItemRowProps) {
  const isHero = variant === 'hero'

  if (isHero) {
    return (
      <li className="bg-background/50 border-border/40 flex flex-col justify-between gap-1.5 rounded-lg border p-2.5 sm:flex-row sm:items-center">
        <span className="text-foreground text-sm leading-snug font-medium">
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
    <li className="border-border/30 flex items-center justify-between gap-2 border-b py-1 text-xs last:border-b-0">
      <span className="text-foreground/90 text-sm font-medium">
        {item.name}
      </span>

      <div className="flex shrink-0 items-center gap-1 empty:hidden">
        {item.hasGluten && <DietaryBadge type="gluten" compact />}
        {item.hasLactose && <DietaryBadge type="lactose" compact />}
      </div>
    </li>
  )
}
