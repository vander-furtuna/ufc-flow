import type { MealCategory } from '@/types/ru'
import { CategoryCard } from './category-card'

interface StandardCategoriesGridProps {
  categories: MealCategory[]
}

export function StandardCategoriesGrid({
  categories,
}: StandardCategoriesGridProps) {
  if (!categories.length) return null

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
      {categories.map((category) => (
        <CategoryCard key={category.category} category={category} />
      ))}
    </div>
  )
}
