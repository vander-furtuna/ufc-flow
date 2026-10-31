import { useMemo } from 'react'
import type { Meal, MealCategory } from '@/types/ru'
import { isHeroCategory, isVegetarianCategory } from './category-meta'

export interface UseFilteredMealOptions {
  meal: Meal | null
  searchQuery?: string
  onlyVegetarian?: boolean
  glutenFree?: boolean
  lactoseFree?: boolean
}

export interface UseFilteredMealResult {
  isEmptyMeal: boolean
  isFilteredEmpty: boolean
  heroCategories: MealCategory[]
  otherCategories: MealCategory[]
  totalItemsCount: number
}

export function useFilteredMeal({
  meal,
  searchQuery = '',
  onlyVegetarian = false,
  glutenFree = false,
  lactoseFree = false,
}: UseFilteredMealOptions): UseFilteredMealResult {
  return useMemo(() => {
    if (!meal || meal.isEmpty || !meal.categories.length) {
      return {
        isEmptyMeal: true,
        isFilteredEmpty: false,
        heroCategories: [],
        otherCategories: [],
        totalItemsCount: 0,
      }
    }

    const query = searchQuery.toLowerCase().trim()

    const filteredCategories = meal.categories
      .map((cat) => {
        const isVeg = isVegetarianCategory(cat.category)

        if (
          onlyVegetarian &&
          cat.category.toLowerCase().includes('principal') &&
          !isVeg
        ) {
          return null
        }

        const filteredItems = cat.items.filter((item) => {
          if (query && !item.name.toLowerCase().includes(query)) {
            return false
          }
          if (glutenFree && item.hasGluten) {
            return false
          }
          if (lactoseFree && item.hasLactose) {
            return false
          }
          return true
        })

        if (!filteredItems.length) return null

        return {
          ...cat,
          items: filteredItems,
        } as MealCategory
      })
      .filter((cat): cat is MealCategory => Boolean(cat))

    if (!filteredCategories.length) {
      return {
        isEmptyMeal: false,
        isFilteredEmpty: true,
        heroCategories: [],
        otherCategories: [],
        totalItemsCount: 0,
      }
    }

    const heroCategories = filteredCategories.filter((cat) =>
      isHeroCategory(cat.category),
    )
    const otherCategories = filteredCategories.filter(
      (cat) => !isHeroCategory(cat.category),
    )

    const totalItemsCount = filteredCategories.reduce(
      (acc, cat) => acc + cat.items.length,
      0,
    )

    return {
      isEmptyMeal: false,
      isFilteredEmpty: false,
      heroCategories,
      otherCategories,
      totalItemsCount,
    }
  }, [meal, searchQuery, onlyVegetarian, glutenFree, lactoseFree])
}
