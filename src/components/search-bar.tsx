'use client'

import { useParams } from 'next/navigation'
import { useFilter } from '@/contexts/filter'
import { AppSearchBar } from './app-search-bar'
import { CurriculumFilterToolbar } from './filter/curriculum-filter-toolbar'

export type SearchBarProps = {
  className?: string
  placeholder?: string
}

export function SearchBar({
  className,
  placeholder = 'Pesquisar',
}: SearchBarProps = {}) {
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
      className={className}
      placeholder={placeholder}
      value={queryFilter}
      onChange={changeQueryFilter}
      onClear={queryFilter ? () => changeQueryFilter('') : undefined}
      baseHref={baseHref}
      currentNavId="grade"
      isFilterActive={isFiltersActive}
      filterToolbar={<CurriculumFilterToolbar />}
    />
  )
}
