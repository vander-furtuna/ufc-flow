import { Glow } from '@/components/glow'
import { cn } from '@/lib/utils'
import { getCategoryMeta, isVegetarianCategory } from './category-meta'
import { CategoryHeader } from './category-header'
import { MealItemRow } from './meal-item-row'
import type { CategoryCardProps } from './types'

export function HeroCategoryCard({ category, className }: CategoryCardProps) {
  const meta = getCategoryMeta(category.category)
  const isVeg = isVegetarianCategory(category.category)

  return (
    <div
      className={cn(
        'bg-card/85 border-border/80 hover:border-border relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 backdrop-blur-md transition-all md:p-5',
        className,
      )}
    >
      {/* Glow ambiental no canto do card */}
      <Glow
        colors={meta.glowColor}
        className="pointer-events-none absolute -top-16 -left-16 size-40 opacity-30 blur-2xl"
      />

      <div className="relative z-10">
        <CategoryHeader
          title={category.category}
          meta={meta}
          isVegetarian={isVeg}
          variant="hero"
        />

        <ul className="flex flex-col gap-1.5">
          {category.items.map((item) => (
            <MealItemRow key={item.id} item={item} variant="hero" />
          ))}
        </ul>
      </div>
    </div>
  )
}
