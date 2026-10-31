import {
  AppleLogoIcon,
  BowlFoodIcon,
  CoffeeIcon,
  CookieIcon,
  FlameIcon,
  ForkKnifeIcon,
  LeafIcon,
  PintGlassIcon,
} from '@phosphor-icons/react'
import type { CategoryMeta } from './types'

export function isVegetarianCategory(categoryName: string): boolean {
  return categoryName.toLowerCase().includes('vegetariano')
}

export function isHeroCategory(categoryName: string): boolean {
  const norm = categoryName.toLowerCase()
  return norm.includes('principal') || norm.includes('vegetariano')
}

export function getCategoryMeta(categoryName: string): CategoryMeta {
  const norm = categoryName.toLowerCase()

  if (norm.includes('principal')) {
    return {
      icon: FlameIcon,
      glowColor: '#f97316',
      isHero: true,
    }
  }

  if (norm.includes('vegetariano')) {
    return {
      icon: LeafIcon,
      glowColor: '#10b981',
      isHero: true,
    }
  }

  if (norm.includes('salada')) {
    return {
      icon: BowlFoodIcon,
      glowColor: '#22c55e',
      isHero: false,
    }
  }

  if (norm.includes('guarni')) {
    return {
      icon: BowlFoodIcon,
      glowColor: '#f59e0b',
      isHero: false,
    }
  }

  if (norm.includes('acompanhamento')) {
    return {
      icon: ForkKnifeIcon,
      glowColor: '#3b82f6',
      isHero: false,
    }
  }

  if (norm.includes('suco') || norm.includes('bebida')) {
    return {
      icon: PintGlassIcon,
      glowColor: '#ec4899',
      isHero: false,
    }
  }

  if (norm.includes('sobremesa') || norm.includes('fruta')) {
    return {
      icon: AppleLogoIcon,
      glowColor: '#ef4444',
      isHero: false,
    }
  }

  if (norm.includes('pães') || norm.includes('especial')) {
    return {
      icon: CookieIcon,
      glowColor: '#d97706',
      isHero: false,
    }
  }

  return {
    icon: CoffeeIcon,
    glowColor: '#22d3ee',
    isHero: false,
  }
}
