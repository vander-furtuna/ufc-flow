import { CoffeeIcon, ForkKnifeIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { MealEmptyStateProps } from './types'

export function MealEmptyState({
  type = 'no-meal',
  title,
  description,
  className,
}: MealEmptyStateProps) {
  const isNoMeal = type === 'no-meal'

  const resolvedTitle =
    title ??
    (isNoMeal
      ? 'Nenhum item cadastrado para esta refeição'
      : 'Nenhum prato corresponde aos filtros selecionados')

  const resolvedDescription =
    description ??
    (isNoMeal
      ? 'Este cardápio pode não estar disponível para este horário ou este campus não oferece este serviço.'
      : 'Tente limpar a pesquisa ou os filtros de alérgenos.')

  const Icon = isNoMeal ? CoffeeIcon : ForkKnifeIcon

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isNoMeal ? 'p-12' : 'p-10',
        className,
      )}
    >
      <Icon
        weight="bold"
        className={cn(
          'mb-3 text-muted-foreground/60',
          isNoMeal ? 'size-10' : 'size-8',
        )}
      />
      {isNoMeal ? (
        <h3 className="text-base font-semibold text-foreground">
          {resolvedTitle}
        </h3>
      ) : (
        <h4 className="text-sm font-semibold text-foreground">
          {resolvedTitle}
        </h4>
      )}
      <p
        className={cn(
          'mt-1 text-muted-foreground',
          isNoMeal ? 'max-w-md text-xs sm:text-sm' : 'text-xs',
        )}
      >
        {resolvedDescription}
      </p>
    </div>
  )
}
