import { Glow } from '@/components/glow'
import { cn } from '@/lib/utils'
import { getCategoryMeta } from './category-meta'
import { CategoryHeader } from './category-header'
import { MealItemRow } from './meal-item-row'
import type { CategoryCardProps } from './types'

export function CategoryCard({ category, className }: CategoryCardProps) {
  const meta = getCategoryMeta(category.category)

  return (
    <div
      className={cn(
        'bg-card/40 border-border/60 hover:border-border/90 relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 shadow-xs backdrop-blur-sm transition-all',
        className,
      )}
    >
      {/* Glow sutil no canto */}
      <Glow
        colors={meta.glowColor}
        className="pointer-events-none absolute -top-12 -left-12 size-28 opacity-30 blur-xl"
      />

      <div className="relative z-10">
        <CategoryHeader
          title={category.category}
          meta={meta}
          variant="compact"
        />

        <ul className="flex flex-col gap-1.5">
          {category.items.map((item) => (
            <MealItemRow key={item.id} item={item} variant="compact" />
          ))}
        </ul>
      </div>
    </div>
  )
}
