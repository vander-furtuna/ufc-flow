import type { MonthGroup } from '@/types/calendar'

type GetCalendarServiceParams = {
  year: number
}

export async function getCalendarService({
  year,
}: GetCalendarServiceParams): Promise<MonthGroup[]> {
  const response = await fetch(`/api/calendar?year=${year}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch calendar information')
  }

  const data = (await response.json()) as MonthGroup[]

  return data
}
