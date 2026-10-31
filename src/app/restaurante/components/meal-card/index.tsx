'use client'

import { useFilteredMeal } from './use-filtered-meal'
import { MealEmptyState } from './meal-empty-state'
import { HeroCategoriesGrid } from './hero-categories-grid'
import { StandardCategoriesGrid } from './standard-categories-grid'
import type { MealCardProps } from './types'

export function MealCard({
  meal,
  searchQuery = '',
  onlyVegetarian = false,
  glutenFree = false,
  lactoseFree = false,
}: MealCardProps) {
  const { isEmptyMeal, isFilteredEmpty, heroCategories, otherCategories } =
    useFilteredMeal({
      meal,
      searchQuery,
      onlyVegetarian,
      glutenFree,
      lactoseFree,
    })

  if (isEmptyMeal) {
    return <MealEmptyState type="no-meal" />
  }

  if (isFilteredEmpty) {
    return <MealEmptyState type="no-filter-match" />
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <HeroCategoriesGrid categories={heroCategories} />
      <StandardCategoriesGrid categories={otherCategories} />
    </div>
  )
}

// Re-export subcomponents, hooks, and types for maximum modularity
export { HeroCategoriesGrid } from './hero-categories-grid'
export { StandardCategoriesGrid } from './standard-categories-grid'
export { HeroCategoryCard } from './hero-category-card'
export { CategoryCard } from './category-card'
export { CategoryHeader } from './category-header'
export { MealItemRow } from './meal-item-row'
export { MealEmptyState } from './meal-empty-state'
export { useFilteredMeal } from './use-filtered-meal'
export * from './category-meta'
export * from './types'
