import 'server-only'

import type { AcademicTerm, CourseSections } from '@ufc-flow/contracts'
import { cache } from 'react'

import { CATALOG_TAG } from '@/lib/catalog/public-catalog'

// Mesmo cache do catálogo: 5 minutos, e as ações do admin invalidam a tag
const REVALIDATE_SECONDS = 300

export type CurrentTerm = { year: number; semester: number }

async function get<T>(path: string): Promise<T | null> {
  const apiUrl = process.env.API_URL
  if (!apiUrl) return null
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS, tags: [CATALOG_TAG] },
  })
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`API respondeu ${response.status} em ${path}`)
  }
  return (await response.json()) as T
}

function fromEnv(): CurrentTerm {
  const year = Number(process.env.NEXT_PUBLIC_CURRENT_YEAR)
  const semester = Number(process.env.NEXT_PUBLIC_CURRENT_SEMESTER)
  return {
    year: Number.isInteger(year) && year > 0 ? year : new Date().getFullYear(),
    semester: semester === 1 ? 1 : 2,
  }
}

// Semestre vigente: o que o admin marcou na API. Sem API_URL, sem semestre
// marcado ou com a API fora do ar, continuam as variáveis de ambiente.
export const getCurrentTerm = cache(async (): Promise<CurrentTerm> => {
  try {
    const term = await get<AcademicTerm>('/v1/terms/current')
    if (term) {
      const [year, period] = term.code.split('.').map(Number)
      return { year: year!, semester: period! }
    }
  } catch (error) {
    console.error(
      `Semestre vigente indisponível na API: ${(error as Error).message}`,
    )
  }
  return fromEnv()
})

// Turmas do curso já coletadas pela API. Nulo quando a API não está
// configurada, não conhece o semestre ou o curso, ou ainda não coletou.
export async function getCourseSections(
  term: string,
  courseSlug: string,
): Promise<CourseSections | null> {
  const data = await get<CourseSections>(
    `/v1/terms/${encodeURIComponent(term)}/courses/${encodeURIComponent(courseSlug)}/sections`,
  )
  return data?.collectedAt ? data : null
}
