import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import type { Meal, MealCategory, MenuItem } from '@/types/ru'

export interface MealCardProps {
  meal: Meal | null
  searchQuery?: string
  onlyVegetarian?: boolean
  glutenFree?: boolean
  lactoseFree?: boolean
}

export interface CategoryMeta {
  icon: ComponentType<IconProps>
  glowColor: string
  isHero: boolean
}

export interface CategoryHeaderProps {
  title: string
  meta: CategoryMeta
  isVegetarian?: boolean
  variant?: 'hero' | 'compact'
}

export interface MealItemRowProps {
  item: MenuItem
  variant?: 'hero' | 'compact'
}

export interface CategoryCardProps {
  category: MealCategory
  className?: string
}

export type MealEmptyStateType = 'no-meal' | 'no-filter-match'

export interface MealEmptyStateProps {
  type?: MealEmptyStateType
  title?: string
  description?: string
  className?: string
}
