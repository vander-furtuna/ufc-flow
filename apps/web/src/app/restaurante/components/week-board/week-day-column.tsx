'use client'

import {
  ArrowSquareOutIcon,
  CalendarXIcon,
  CoffeeIcon,
  ForkKnifeIcon,
  MoonIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Glow } from '@/components/glow'
import { useFilteredMeal } from '../meal-card/use-filtered-meal'
import { getCategoryMeta } from '../meal-card/category-meta'
import { DietaryBadge } from '../dietary-badge'
import type { Meal, MealCategory, RUMenuDay, WeekMealFilter } from '@/types/ru'

interface WeekDayColumnProps {
  day: RUMenuDay
  activeMealFilter: WeekMealFilter
  searchQuery?: string
  onlyVegetarian?: boolean
  glutenFree?: boolean
  lactoseFree?: boolean
  onSelectDay: (date: string) => void
  isToday: boolean
}

interface MealBlockProps {
  meal: Meal | null
  title: string
  icon: typeof ForkKnifeIcon
  searchQuery?: string
  onlyVegetarian?: boolean
  glutenFree?: boolean
  lactoseFree?: boolean
  showMealTitle?: boolean
}

function MealBlock({
  meal,
  title,
  icon: Icon,
  searchQuery,
  onlyVegetarian,
  glutenFree,
  lactoseFree,
  showMealTitle = false,
}: MealBlockProps) {
  const { isEmptyMeal, isFilteredEmpty, heroCategories, otherCategories } =
    useFilteredMeal({
      meal,
      searchQuery,
      onlyVegetarian,
      glutenFree,
      lactoseFree,
    })

  if (isEmptyMeal) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground italic">
          Sem {title.toLowerCase()} cadastrado
        </p>
      </div>
    )
  }

  if (isFilteredEmpty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground italic">
          Nenhum item compatível com os filtros
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {showMealTitle && (
        <div className="flex items-center gap-1.5 border-b border-border/50 pb-1.5">
          <Icon weight="bold" className="size-3.5 shrink-0 text-primary" />
          <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
            {title}
          </span>
        </div>
      )}

      {/* Categorias Principais (Principal e Vegetariano) */}
      {heroCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          {heroCategories.map((cat: MealCategory) => {
            const meta = getCategoryMeta(cat.category)
            const CatIcon = meta.icon

            return (
              <div
                key={cat.category}
                className="relative overflow-hidden rounded-xl border border-border/60 bg-accent/40 p-2 shadow-2xs"
              >
                {meta.glowColor && (
                  <Glow
                    colors={meta.glowColor}
                    className="pointer-events-none absolute -top-3 -left-3 size-14 opacity-25 blur-lg"
                  />
                )}
                <div className="mb-1.5 flex items-center gap-1.5">
                  <CatIcon
                    weight="bold"
                    className="size-3.5 shrink-0"
                    style={{ color: meta.glowColor }}
                  />
                  <span className="text-xs font-semibold text-foreground/90">
                    {cat.category}
                  </span>
                </div>

                <ul className="flex flex-col gap-1">
                  {cat.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-1.5 rounded-md border border-border/40 bg-background/60 p-1.5 text-xs font-medium"
                    >
                      <span className="leading-snug text-foreground">
                        {item.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-1 pt-0.5 empty:hidden">
                        {item.hasGluten && (
                          <DietaryBadge type="gluten" compact />
                        )}
                        {item.hasLactose && (
                          <DietaryBadge type="lactose" compact />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* Outras Categorias (Guarnição, Acompanhamentos, Salada, Sobremesa, etc.) */}
      {otherCategories.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-background/40 p-2.5">
          {otherCategories.map((cat: MealCategory, idx) => (
            <div
              key={cat.category}
              className={cn(
                'flex flex-col gap-1',
                idx > 0 && 'border-t border-border/30 pt-1.5',
              )}
            >
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {cat.category}
              </span>
              <ul className="flex flex-col gap-1">
                {cat.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-1.5 text-xs"
                  >
                    <span className="font-medium text-foreground/90">
                      {item.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1 empty:hidden">
                      {item.hasGluten && <DietaryBadge type="gluten" compact />}
                      {item.hasLactose && (
                        <DietaryBadge type="lactose" compact />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function WeekDayColumn({
  day,
  activeMealFilter,
  searchQuery = '',
  onlyVegetarian = false,
  glutenFree = false,
  lactoseFree = false,
  onSelectDay,
  isToday,
}: WeekDayColumnProps) {
  // Extrai o nome do dia da semana e a data DD/MM
  const [dayOfWeekName] = day.currentLabel.split('(')
  const cleanDayOfWeek = dayOfWeekName.trim()
  const dateFormatted = day.date.split('-').slice(1).reverse().join('/')

  return (
    <div
      className={cn(
        'flex h-full w-full min-w-70 shrink-0 flex-col rounded-2xl border border-border/80 bg-card/75 p-2.5 shadow-xs backdrop-blur-md transition-all sm:min-w-75 lg:min-w-0',
        isToday && 'border-primary/50 shadow-md ring-2 ring-primary/20',
      )}
    >
      {/* Cabeçalho da Coluna do Dia */}
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-clash text-base font-semibold tracking-tight text-foreground capitalize">
              {cleanDayOfWeek}
            </span>
            {isToday && (
              <span className="relative inline-flex items-center gap-1 overflow-hidden rounded-full border border-border bg-accent px-2 py-0.5 text-[9px] font-bold tracking-wider text-foreground/90 uppercase select-none">
                <Glow
                  colors="#22d3ee"
                  className="pointer-events-none absolute -left-2 size-5 opacity-90 blur-xs"
                />
                <span className="relative z-10">Hoje</span>
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {dateFormatted}
          </span>
        </div>

        {/* Botão de Atalho para Ver Dia Detalhado */}
        <button
          type="button"
          onClick={() => onSelectDay(day.date)}
          className="flex items-center gap-1 rounded-lg border border-transparent p-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-accent/80 hover:text-foreground active:scale-95"
          title={`Ver cardápio completo de ${cleanDayOfWeek} (${dateFormatted})`}
          aria-label={`Ver cardápio detalhado de ${cleanDayOfWeek}`}
        >
          <span className="hidden text-[11px] xl:inline">Ver dia</span>
          <ArrowSquareOutIcon weight="bold" className="size-3.5" />
        </button>
      </div>

      {/* Conteúdo das Refeições do Dia */}
      <div className="flex flex-1 flex-col gap-3">
        {day.isClosedOrEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border/40 bg-muted/20 p-6 text-center">
            <CalendarXIcon
              weight="bold"
              className="mb-2 size-7 text-muted-foreground/60"
            />
            <p className="text-xs font-medium text-foreground/80">
              {day.emptyMessage || 'Restaurante Fechado'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Sem expediente ou cardápio não publicado.
            </p>
          </div>
        ) : activeMealFilter === 'all' ? (
          <div className="flex flex-col gap-4">
            {day.meals.desjejum && !day.meals.desjejum.isEmpty && (
              <MealBlock
                meal={day.meals.desjejum}
                title="Desjejum"
                icon={CoffeeIcon}
                showMealTitle
                searchQuery={searchQuery}
                onlyVegetarian={onlyVegetarian}
                glutenFree={glutenFree}
                lactoseFree={lactoseFree}
              />
            )}
            {day.meals.almoco && !day.meals.almoco.isEmpty && (
              <MealBlock
                meal={day.meals.almoco}
                title="Almoço"
                icon={ForkKnifeIcon}
                showMealTitle
                searchQuery={searchQuery}
                onlyVegetarian={onlyVegetarian}
                glutenFree={glutenFree}
                lactoseFree={lactoseFree}
              />
            )}
            {day.meals.jantar && !day.meals.jantar.isEmpty && (
              <MealBlock
                meal={day.meals.jantar}
                title="Jantar"
                icon={MoonIcon}
                showMealTitle
                searchQuery={searchQuery}
                onlyVegetarian={onlyVegetarian}
                glutenFree={glutenFree}
                lactoseFree={lactoseFree}
              />
            )}
          </div>
        ) : (
          <MealBlock
            meal={
              activeMealFilter === 'almoco'
                ? day.meals.almoco
                : activeMealFilter === 'jantar'
                  ? day.meals.jantar
                  : day.meals.desjejum
            }
            title={
              activeMealFilter === 'almoco'
                ? 'Almoço'
                : activeMealFilter === 'jantar'
                  ? 'Jantar'
                  : 'Desjejum'
            }
            icon={
              activeMealFilter === 'almoco'
                ? ForkKnifeIcon
                : activeMealFilter === 'jantar'
                  ? MoonIcon
                  : CoffeeIcon
            }
            searchQuery={searchQuery}
            onlyVegetarian={onlyVegetarian}
            glutenFree={glutenFree}
            lactoseFree={lactoseFree}
          />
        )}
      </div>
    </div>
  )
}
