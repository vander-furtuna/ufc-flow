import type { CourseGroup } from '@/utils/get-subjects-informations';

type GetClassesInformationsParams = { year: number; semester: number }

export async function getClassesInformationsService({
  year,
  semester,
}: GetClassesInformationsParams): Promise<CourseGroup[]> {
  const response = await fetch('/api/scrapping', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ year, semester }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch classes information')
  }

  const data = await response.json()
  return data as CourseGroup[]
}
