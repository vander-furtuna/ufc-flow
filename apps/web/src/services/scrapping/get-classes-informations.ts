import type { StorageClass, SubjectGroup } from '@/types/class'

type GetClassesInformationsParams = {
  year: number
  semester: number
  courseId: string
  courseSlug?: string
}

export async function getClassesInformationsService({
  year,
  semester,
  courseId,
  courseSlug,
}: GetClassesInformationsParams): Promise<StorageClass> {
  const response = await fetch('/api/scrapping', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ year, semester, courseId, courseSlug }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch classes information')
  }

  const data = (await response.json()) as SubjectGroup[]

  const formattedData: StorageClass = {
    year,
    semester,
    classGroup: data,
  }

  return formattedData
}
