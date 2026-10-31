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
          'text-muted-foreground/60 mb-3',
          isNoMeal ? 'size-10' : 'size-8',
        )}
      />
      {isNoMeal ? (
        <h3 className="text-foreground text-base font-semibold">
          {resolvedTitle}
        </h3>
      ) : (
        <h4 className="text-foreground text-sm font-semibold">
          {resolvedTitle}
        </h4>
      )}
      <p
        className={cn(
          'text-muted-foreground mt-1',
          isNoMeal ? 'max-w-md text-xs sm:text-sm' : 'text-xs',
        )}
      >
        {resolvedDescription}
      </p>
    </div>
  )
}
