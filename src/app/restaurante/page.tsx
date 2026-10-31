'use client'

import { useState, useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/theme-toggle'
import { CampusSelector } from './components/campus-selector'
import { DayNavigator } from './components/day-navigator'
import { MealTabs } from './components/meal-tabs'
import { MealCard } from './components/meal-card'
import { RuEmptyState } from './components/ru-empty-state'
import { RuSkeleton } from './components/ru-skeleton'
import {
  ViewSwitcher,
  type ViewSwitcherOption,
} from '@/components/view-switcher'
import { WeekNavigator } from './components/week-navigator'
import { WeekMealTabs } from './components/week-meal-tabs'
import { WeekBoard, WeekSkeleton } from './components/week-board'
import { useRuMenu } from '@/hooks/use-ru-menu'
import { useRuMenuWeek } from '@/hooks/use-ru-menu-week'
import { getFortalezaTodayDate, getMondayOfWeek } from '@/lib/ru-scraper'
import {
  DEFAULT_CAMPUS_ID,
  UFC_CAMPUSES,
  resolveCampusId,
  type CampusId,
  type MealType,
  type RUViewMode,
  type WeekMealFilter,
} from '@/types/ru'
import {
  ArrowsClockwiseIcon,
  BroomIcon,
  CalendarBlankIcon,
  ColumnsIcon,
  CreditCardIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { AppSearchBar } from '@/components/app-search-bar'
import { DietaryFilters } from './components/dietary-filters'
import type { DietaryType } from './components/dietary-badge'
import { cn } from '@/lib/utils'

function getDefaultMealType(): MealType {
  const now = new Date()
  const hour = now.getHours()
  const minutes = now.getMinutes()
  const time = hour + minutes / 60

  if (time < 9.0) return 'desjejum'
  if (time <= 14.5) return 'almoco'
  return 'jantar'
}

// Mecanismo de subscrição reativa para localStorage com compatibilidade SSR pura
const storageListeners = new Set<() => void>()

function emitStorageChange() {
  for (const listener of storageListeners) {
    listener()
  }
}

function subscribeToStorage(callback: () => void) {
  storageListeners.add(callback)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', callback)
  }
  return () => {
    storageListeners.delete(callback)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', callback)
    }
  }
}

function getSavedCampus(): CampusId {
  if (typeof window === 'undefined') return DEFAULT_CAMPUS_ID
  try {
    return resolveCampusId(localStorage.getItem('ufc_flow_ru_campus'))
  } catch {
    // Ignora erro se localStorage inacessível
  }
  return DEFAULT_CAMPUS_ID
}

function getServerCampus(): CampusId {
  return DEFAULT_CAMPUS_ID
}

const VIEW_MODE_OPTIONS: ViewSwitcherOption<RUViewMode>[] = [
  {
    value: 'day',
    label: 'Dia',
    icon: CalendarBlankIcon,
    title: 'Visualizar cardápio do dia',
  },
  {
    value: 'week',
    label: 'Semana',
    icon: ColumnsIcon,
    title: 'Visualizar cardápio da semana em colunas',
  },
]

function getSavedViewMode(): RUViewMode {
  if (typeof window === 'undefined') return 'day'
  try {
    const saved = localStorage.getItem('ufc_flow_ru_view_mode')
    if (saved === 'day' || saved === 'week') {
      return saved
    }
  } catch {
    // Ignora erro
  }
  return 'day'
}

function getServerViewMode(): RUViewMode {
  return 'day'
}

export default function RestaurantePage() {
  // Sincronização segura de campus e modo de visualização com useSyncExternalStore
  // No SSR e na hidratação inicial, o React usa getServerSnapshot (valores determinísticos),
  // eliminando qualquer possibilidade de erro de hidratação.
  const selectedCampusId = useSyncExternalStore(
    subscribeToStorage,
    getSavedCampus,
    getServerCampus,
  )

  const viewMode = useSyncExternalStore(
    subscribeToStorage,
    getSavedViewMode,
    getServerViewMode,
  )

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  // Estados da visão de Dia
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    undefined,
  )
  const [userSelectedMeal, setUserSelectedMeal] = useState<MealType | null>(
    null,
  )

  // Estados da visão de Semana
  const [selectedWeekDate, setSelectedWeekDate] = useState<string | undefined>(
    undefined,
  )
  const [weekMealFilter, setWeekMealFilter] = useState<WeekMealFilter>('almoco')

  // Filtros de busca e restrição alimentar compartilhados
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyVegetarian, setOnlyVegetarian] = useState(false)
  const [glutenFree, setGlutenFree] = useState(false)
  const [lactoseFree, setLactoseFree] = useState(false)

  const isDietaryActive = (type: DietaryType) => {
    if (type === 'vegetarian') return onlyVegetarian
    if (type === 'gluten') return glutenFree
    if (type === 'lactose') return lactoseFree
    return false
  }

  const toggleDietaryFilter = (type: DietaryType) => {
    if (type === 'vegetarian') setOnlyVegetarian((v) => !v)
    else if (type === 'gluten') setGlutenFree((v) => !v)
    else if (type === 'lactose') setLactoseFree((v) => !v)
  }

  // Persiste campus selecionado e emite atualização
  const handleSelectCampus = (id: CampusId) => {
    try {
      localStorage.setItem('ufc_flow_ru_campus', String(id))
      emitStorageChange()
    } catch {
      // Ignora erro
    }
  }

  // Persiste modo de visualização e emite atualização
  const handleSelectViewMode = (mode: RUViewMode) => {
    try {
      localStorage.setItem('ufc_flow_ru_view_mode', mode)
      emitStorageChange()
    } catch {
      // Ignora erro
    }
  }

  // Transição rápida de uma coluna da semana para o dia detalhado
  const handleSelectDayFromWeek = (date: string) => {
    setSelectedDate(date)
    handleSelectViewMode('day')
  }

  // Hook de busca do cardápio diário via TanStack Query e IndexedDB
  const {
    data: dayData,
    isLoading: isDayLoading,
    isError: isDayError,
    error: dayError,
    refetch: refetchDay,
    isFetching: isDayFetching,
  } = useRuMenu({
    campusId: selectedCampusId,
    date: selectedDate,
  })

  // Hook de busca do cardápio semanal via TanStack Query e IndexedDB
  const {
    data: weekData,
    isLoading: isWeekLoading,
    isError: isWeekError,
    error: weekError,
    refetch: refetchWeek,
    isFetching: isWeekFetching,
  } = useRuMenuWeek({
    campusId: selectedCampusId,
    date: selectedWeekDate || selectedDate,
    enabled: viewMode === 'week',
  })

  // Refeição ativa diária calculada de forma pura e reativa
  const activeMeal: MealType = useMemo(() => {
    if (userSelectedMeal) return userSelectedMeal

    if (dayData?.meals && !dayData.isClosedOrEmpty) {
      const defaultMeal = isClient ? getDefaultMealType() : 'almoco'
      const currentMealData = dayData.meals[defaultMeal]
      if (currentMealData && !currentMealData.isEmpty) return defaultMeal

      if (dayData.meals.almoco && !dayData.meals.almoco.isEmpty) return 'almoco'
      if (dayData.meals.jantar && !dayData.meals.jantar.isEmpty) return 'jantar'
      if (dayData.meals.desjejum && !dayData.meals.desjejum.isEmpty)
        return 'desjejum'

      return defaultMeal
    }

    return isClient ? getDefaultMealType() : 'almoco'
  }, [userSelectedMeal, dayData, isClient])

  const currentCampusInfo = useMemo(
    () =>
      UFC_CAMPUSES.find((c) => c.id === selectedCampusId) || UFC_CAMPUSES[0],
    [selectedCampusId],
  )

  const today = getFortalezaTodayDate()
  const isToday = !selectedDate
    ? !dayData?.date || dayData.date === today
    : selectedDate === today

  const currentMonday = useMemo(() => getMondayOfWeek(), [])
  const isCurrentWeek = useMemo(() => {
    if (!selectedWeekDate) return true
    return getMondayOfWeek(selectedWeekDate) === currentMonday
  }, [selectedWeekDate, currentMonday])

  const isFetching = viewMode === 'week' ? isWeekFetching : isDayFetching
  const isLoading = viewMode === 'week' ? isWeekLoading : isDayLoading

  const activeMealData = dayData?.meals ? dayData.meals[activeMeal] : null

  // Verifica disponibilidade de refeições na semana para habilitar as abas
  const weekHasDesjejum = useMemo(() => {
    return Boolean(
      weekData?.days.some((d) => d.meals.desjejum && !d.meals.desjejum.isEmpty),
    )
  }, [weekData])

  const weekHasAlmoco = useMemo(() => {
    return Boolean(
      weekData?.days.some((d) => d.meals.almoco && !d.meals.almoco.isEmpty),
    )
  }, [weekData])

  const weekHasJantar = useMemo(() => {
    return Boolean(
      weekData?.days.some((d) => d.meals.jantar && !d.meals.jantar.isEmpty),
    )
  }, [weekData])

  return (
    <div className="flex min-h-dvh w-full justify-center px-3 pt-4 pb-28 sm:px-6 sm:pt-6">
      <div
        className={cn(
          'flex w-full flex-col gap-6 transition-all duration-300',
          viewMode === 'week' ? 'max-w-7xl' : 'max-w-5xl',
        )}
      >
        {/* Header do UFC Flow */}
        <header className="flex h-16 w-full shrink-0 items-center justify-between">
          <Link href="/" aria-label="Retornar para o início">
            <Logo className="h-10 sm:h-12" isResponsive />
          </Link>

          <div className="flex items-center gap-2">
            <CampusSelector
              selectedCampusId={selectedCampusId}
              onSelectCampus={handleSelectCampus}
              disabled={isLoading || isFetching}
            />
            <ViewSwitcher
              options={VIEW_MODE_OPTIONS}
              value={viewMode}
              onValueChange={handleSelectViewMode}
              ariaLabel="Modo de visualização do cardápio"
              disabled={isLoading || isFetching}
            />
            <ModeToggle />
          </div>
        </header>

        {/* Título & Navegador de Datas/Semanas */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-foreground font-clash text-3xl font-semibold tracking-tight sm:text-4xl">
                Cardápio do RU
              </h1>
              <p className="text-muted-foreground text-sm">
                Restaurante Universitário • {currentCampusInfo.name}
                {currentCampusInfo.units &&
                  ` (${currentCampusInfo.units.join(', ')})`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
              {isFetching && !isLoading && (
                <div className="text-muted-foreground flex animate-pulse items-center gap-1.5 text-xs">
                  <ArrowsClockwiseIcon
                    weight="bold"
                    className="size-3.5 animate-spin"
                  />
                  <span className="hidden sm:inline">
                    Atualizando cardápio...
                  </span>
                </div>
              )}

              <a
                href="https://si3.ufc.br/public/jsp/restaurante_universitario/consulta_comensal_ru.jsf"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-accent/60 hover:bg-accent border-border/80 hover:border-border text-foreground flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium shadow-xs backdrop-blur-md transition-all active:scale-95 sm:text-sm"
                title="Recarregar cartão do RU (SI3)"
                aria-label="Recarregar cartão do RU"
              >
                <CreditCardIcon
                  weight="bold"
                  className="text-primary size-4 shrink-0 transition-transform group-hover:scale-110"
                />
                <span className="hidden font-medium sm:inline-block">
                  Recarga
                </span>
                <span className="inline-block sm:hidden">+</span>
              </a>
            </div>
          </div>

          {/* Navegação: Dia ou Semana */}
          {viewMode === 'day' ? (
            <DayNavigator
              currentDate={
                dayData?.date || selectedDate || getFortalezaTodayDate()
              }
              currentLabel={dayData?.currentLabel}
              prevDate={dayData?.prevDate || null}
              prevLabel={dayData?.prevLabel || null}
              nextDate={dayData?.nextDate || null}
              nextLabel={dayData?.nextLabel || null}
              onNavigate={(newDate) => setSelectedDate(newDate)}
              onResetToday={() => setSelectedDate(undefined)}
              isToday={isToday}
              isLoading={isDayLoading}
            />
          ) : (
            <WeekNavigator
              label={weekData?.label}
              weekStartDate={
                weekData?.weekStartDate ||
                (selectedWeekDate
                  ? getMondayOfWeek(selectedWeekDate)
                  : currentMonday)
              }
              prevWeekDate={weekData?.prevWeekDate || null}
              nextWeekDate={weekData?.nextWeekDate || null}
              onNavigate={(newDate) => setSelectedWeekDate(newDate)}
              onResetCurrentWeek={() => setSelectedWeekDate(undefined)}
              isCurrentWeek={isCurrentWeek}
              isLoading={isWeekLoading}
            />
          )}
        </div>

        {/* Abas de Refeições (Dia ou Semana) */}
        {viewMode === 'day'
          ? !isDayLoading &&
            !dayData?.isClosedOrEmpty && (
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <MealTabs
                  activeMeal={activeMeal}
                  onSelectMeal={(m) => setUserSelectedMeal(m)}
                  hasDesjejum={Boolean(
                    dayData?.meals.desjejum && !dayData.meals.desjejum.isEmpty,
                  )}
                  hasAlmoco={Boolean(
                    dayData?.meals.almoco && !dayData.meals.almoco.isEmpty,
                  )}
                  hasJantar={Boolean(
                    dayData?.meals.jantar && !dayData.meals.jantar.isEmpty,
                  )}
                />
              </div>
            )
          : !isWeekLoading &&
            weekData && (
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <WeekMealTabs
                  activeMealFilter={weekMealFilter}
                  onSelectMealFilter={setWeekMealFilter}
                  hasDesjejum={weekHasDesjejum}
                  hasAlmoco={weekHasAlmoco}
                  hasJantar={weekHasJantar}
                />
              </div>
            )}

        {/* Conteúdo Principal do Cardápio */}
        <main className="h-full w-full">
          {viewMode === 'day' ? (
            isDayLoading ? (
              <RuSkeleton />
            ) : isDayError ? (
              <div className="bg-destructive/10 border-destructive/30 flex flex-col items-center justify-center rounded-2xl border p-8 text-center">
                <WarningCircleIcon
                  weight="bold"
                  className="text-destructive mb-2 size-8"
                />
                <h3 className="text-foreground text-base font-semibold">
                  Falha ao carregar o cardápio do dia
                </h3>
                <p className="text-muted-foreground mt-1 max-w-md text-xs">
                  {dayError?.message ||
                    'O servidor da UFC pode estar temporariamente indisponível.'}
                </p>
                <button
                  type="button"
                  onClick={() => refetchDay()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-xl px-4 py-2 text-xs font-medium transition-all"
                >
                  Tentar novamente
                </button>
              </div>
            ) : dayData?.isClosedOrEmpty ? (
              <RuEmptyState
                message={dayData.emptyMessage}
                nextDate={dayData.nextDate}
                nextLabel={dayData.nextLabel}
                onNavigateNext={() =>
                  dayData.nextDate && setSelectedDate(dayData.nextDate)
                }
                onResetToday={() => setSelectedDate(undefined)}
                isToday={isToday}
              />
            ) : (
              <MealCard
                meal={activeMealData}
                searchQuery={searchQuery}
                onlyVegetarian={onlyVegetarian}
                glutenFree={glutenFree}
                lactoseFree={lactoseFree}
              />
            )
          ) : isWeekLoading ? (
            <WeekSkeleton />
          ) : isWeekError ? (
            <div className="bg-destructive/10 border-destructive/30 flex flex-col items-center justify-center rounded-2xl border p-8 text-center">
              <WarningCircleIcon
                weight="bold"
                className="text-destructive mb-2 size-8"
              />
              <h3 className="text-foreground text-base font-semibold">
                Falha ao carregar o cardápio da semana
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-xs">
                {weekError?.message ||
                  'O servidor da UFC pode estar temporariamente indisponível.'}
              </p>
              <button
                type="button"
                onClick={() => refetchWeek()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-xl px-4 py-2 text-xs font-medium transition-all"
              >
                Tentar novamente
              </button>
            </div>
          ) : weekData ? (
            <WeekBoard
              week={weekData}
              activeMealFilter={weekMealFilter}
              searchQuery={searchQuery}
              onlyVegetarian={onlyVegetarian}
              glutenFree={glutenFree}
              lactoseFree={lactoseFree}
              onSelectDay={handleSelectDayFromWeek}
            />
          ) : null}
        </main>
      </div>

      {/* Dock Inferior Flutuante Padrão UFC Flow */}
      <div className="fixed bottom-8 left-0 z-50 flex w-full justify-center px-4">
        <AppSearchBar
          placeholder="Buscar no cardápio..."
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          currentNavId="restaurante"
          isFilterActive={onlyVegetarian || glutenFree || lactoseFree}
          filterToolbar={
            <>
              <div className="relative flex min-w-0 flex-1">
                <DietaryFilters
                  isDietaryActive={isDietaryActive}
                  onToggleFilter={toggleDietaryFilter}
                />
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="bg-muted-foreground/50 h-4 w-px" />
                <button
                  type="button"
                  onClick={() => {
                    setOnlyVegetarian(false)
                    setGlutenFree(false)
                    setLactoseFree(false)
                  }}
                  className="text-foreground/90 hover:text-foreground transition-all ease-in-out not-disabled:active:scale-90 disabled:opacity-40"
                  disabled={!onlyVegetarian && !glutenFree && !lactoseFree}
                  title="Limpar filtros"
                  aria-label="Limpar filtros de dieta"
                >
                  <BroomIcon weight="bold" className="size-4 sm:size-5" />
                </button>
              </div>
            </>
          }
        />
      </div>
      <div className="to-background pointer-events-none fixed bottom-0 z-49 h-12 w-full bg-linear-to-b from-transparent" />
    </div>
  )
}
