export type CampusId = 1 | 3 | 5 | 6 | 7 | 9

export interface CampusOption {
  id: CampusId
  /** Segmento usado na URL do portal: `/restaurante/cardapio/{slug}` */
  slug: string
  name: string
  fullName: string
  city: string
  units?: string[]
}

export const UFC_CAMPUSES: CampusOption[] = [
  {
    id: 1,
    slug: '1-restaurante-universitario-de-fortaleza',
    name: 'Fortaleza',
    fullName: 'Restaurante Universitário de Fortaleza',
    city: 'Fortaleza',
    units: ['Pici 1', 'Pici 2', 'Benfica', 'Porangabussu', 'Labomar'],
  },
  {
    id: 9,
    slug: '9-restaurante-universitario-de-sobral',
    name: 'Sobral',
    fullName: 'Restaurante Universitário de Sobral',
    city: 'Sobral',
    units: ['Campus Mucambinho', 'Campus CIDAO'],
  },
  {
    id: 5,
    slug: '5-restaurante-universitario-de-quixada',
    name: 'Quixadá',
    fullName: 'Restaurante Universitário de Quixadá',
    city: 'Quixadá',
  },
  {
    id: 3,
    slug: '3-restaurante-universitario-de-russas',
    name: 'Russas',
    fullName: 'Restaurante Universitário de Russas',
    city: 'Russas',
  },
  {
    id: 6,
    slug: '6-restaurante-universitario-de-crateus',
    name: 'Crateús',
    fullName: 'Restaurante Universitário de Crateús',
    city: 'Crateús',
  },
  {
    id: 7,
    slug: '7-restaurante-universitario-de-itapaje',
    name: 'Itapajé',
    fullName: 'Restaurante Universitário de Itapajé',
    city: 'Itapajé',
  },
]

export const DEFAULT_CAMPUS_ID: CampusId = 9

/**
 * Converte um valor arbitrário (query param, localStorage) em um CampusId válido.
 * IDs antigos ou desconhecidos (ex: Sobral era 4) caem no campus padrão.
 */
export function resolveCampusId(value: unknown): CampusId {
  const id = Number(value)
  return UFC_CAMPUSES.find((c) => c.id === id)?.id ?? DEFAULT_CAMPUS_ID
}

export type MealType = 'desjejum' | 'almoco' | 'jantar'

export interface MenuItem {
  id: string
  name: string
  hasGluten: boolean
  hasLactose: boolean
}

export interface MealCategory {
  category: string
  items: MenuItem[]
}

export interface Meal {
  type: MealType
  title: string
  isEmpty: boolean
  categories: MealCategory[]
}

export interface RUMenuDay {
  id: string // `${campusId}-${date}`
  campusId: CampusId
  campusName: string
  date: string // YYYY-MM-DD
  currentLabel: string // e.g. "Sexta (25/09)"
  prevDate: string | null // YYYY-MM-DD
  prevLabel: string | null
  nextDate: string | null // YYYY-MM-DD
  nextLabel: string | null
  isClosedOrEmpty: boolean
  emptyMessage: string | null
  meals: {
    desjejum: Meal | null
    almoco: Meal | null
    jantar: Meal | null
  }
  updatedAt?: string
}

export interface RUMenuFilter {
  searchQuery?: string
  onlyVegetarian?: boolean
  glutenFree?: boolean
  lactoseFree?: boolean
}

export interface RUMenuWeek {
  id: string // `${campusId}-week-${weekStartDate}`
  campusId: CampusId
  campusName: string
  weekStartDate: string // YYYY-MM-DD (Monday)
  weekEndDate: string // YYYY-MM-DD (Friday)
  label: string // e.g. "Semana de 28/09 a 02/10"
  prevWeekDate: string // YYYY-MM-DD
  nextWeekDate: string // YYYY-MM-DD
  days: RUMenuDay[]
  updatedAt?: string
}

export type RUViewMode = 'day' | 'week'
export type WeekMealFilter = 'all' | 'almoco' | 'jantar' | 'desjejum'
