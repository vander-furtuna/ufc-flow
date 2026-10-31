import {
  DEFAULT_CAMPUS_ID,
  type CampusId,
  type RUMenuDay,
  type RUMenuWeek,
} from '@/types/ru'

export interface GetRuMenuParams {
  campusId?: CampusId
  date?: string // YYYY-MM-DD
}

export async function getRuMenuService({
  campusId = DEFAULT_CAMPUS_ID,
  date,
}: GetRuMenuParams = {}): Promise<RUMenuDay> {
  const params = new URLSearchParams()
  if (campusId) params.set('campus', String(campusId))
  if (date) params.set('date', date)

  const response = await fetch(`/api/ru?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao carregar cardápio do RU')
  }

  const data = (await response.json()) as RUMenuDay
  return data
}

export interface GetRuMenuWeekParams {
  campusId?: CampusId
  date?: string // YYYY-MM-DD
}

export async function getRuMenuWeekService({
  campusId = DEFAULT_CAMPUS_ID,
  date,
}: GetRuMenuWeekParams = {}): Promise<RUMenuWeek> {
  const params = new URLSearchParams()
  if (campusId) params.set('campus', String(campusId))
  if (date) params.set('date', date)

  const response = await fetch(`/api/ru/week?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error || 'Falha ao carregar cardápio semanal do RU',
    )
  }

  const data = (await response.json()) as RUMenuWeek
  return data
}
