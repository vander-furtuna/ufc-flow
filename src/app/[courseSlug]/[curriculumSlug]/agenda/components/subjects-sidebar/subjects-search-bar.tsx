'use client'

import { useParams } from 'next/navigation'
import { useFilter } from '@/contexts/filter'
import { AppSearchBar } from '@/components/app-search-bar'
import { CurriculumFilterToolbar } from '@/components/filter/curriculum-filter-toolbar'
import { cn } from '@/lib/utils'

export type SubjectsSearchBarProps = {
  className?: string
  placeholder?: string
}

export function SubjectsSearchBar({
  className,
  placeholder = 'Pesquisar por nome ou código...',
}: SubjectsSearchBarProps = {}) {
  const params = useParams()
  const courseSlug = params?.courseSlug as string | undefined
  const curriculumSlug = params?.curriculumSlug as string | undefined
  const baseHref =
    courseSlug && curriculumSlug
      ? `/${courseSlug}/${curriculumSlug}`
      : undefined

  const { isFiltersActive, queryFilter, changeQueryFilter } = useFilter()

  return (
    <AppSearchBar
      className={cn(
        'left-1/2 z-600 flex w-[calc(100%-4rem)] -translate-x-1/2 flex-col items-center justify-center gap-2 sm:w-[calc(100%-4rem)]',
        className?.includes('fixed') ? 'fixed' : 'absolute',
        className?.includes('bottom-') ? '' : 'bottom-6',
        className,
      )}
      placeholder={placeholder}
      value={queryFilter}
      onChange={changeQueryFilter}
      onClear={queryFilter ? () => changeQueryFilter('') : undefined}
      baseHref={baseHref}
      currentNavId="agenda"
      isFilterActive={isFiltersActive}
      filterToolbar={<CurriculumFilterToolbar />}
    />
  )
}
