import type { MealCategory } from '@/types/ru'
import { HeroCategoryCard } from './hero-category-card'

interface HeroCategoriesGridProps {
  categories: MealCategory[]
}

export function HeroCategoriesGrid({ categories }: HeroCategoriesGridProps) {
  if (!categories.length) return null

  return (
    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
      {categories.map((category) => (
        <HeroCategoryCard key={category.category} category={category} />
      ))}
    </div>
  )
}
