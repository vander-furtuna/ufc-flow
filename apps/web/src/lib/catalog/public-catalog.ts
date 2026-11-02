import 'server-only'

import type {
  CourseDetail,
  CourseSummary,
  CurriculumDetail,
} from '@ufc-flow/contracts'
import { cache } from 'react'

import type { Course } from '@/types/course'

import { toLegacyCourse } from './legacy-mapper'

// Tag do cache do catálogo; o admin invalida ao publicar ou editar (D65)
export const CATALOG_TAG = 'catalog'

// O cache do Next guarda as respostas por 5 minutos e serve a última boa se
// a API falhar na renovação
const REVALIDATE_SECONDS = 300

async function get<T>(apiUrl: string, path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS, tags: [CATALOG_TAG] },
  })
  if (!response.ok) {
    throw new Error(`API respondeu ${response.status} em ${path}`)
  }
  return (await response.json()) as T
}

async function fromApi(apiUrl: string): Promise<Course[]> {
  const summaries = await get<CourseSummary[]>(apiUrl, '/v1/courses')
  const courses = await Promise.all(
    summaries.map(async ({ slug }) => {
      const course = await get<CourseDetail>(apiUrl, `/v1/courses/${slug}`)
      const curricula = await Promise.all(
        course.curricula.map((curriculum) =>
          get<CurriculumDetail>(
            apiUrl,
            `/v1/courses/${slug}/curricula/${curriculum.slug}`,
          ),
        ),
      )
      return toLegacyCourse(course, curricula)
    }),
  )
  // Curso ainda sem estrutura publicada não aparece na lista pública
  return courses.filter((course) => course.curriculumStructures.length > 0)
}

async function fromStaticData(): Promise<Course[]> {
  return (await import('@/data/courses')).COURSES_DATA
}

// Catálogo das telas públicas. Sem API_URL (previews do Vercel, produção até
// a fase 13), continua o courses.ts (D51). Com a API configurada e fora do
// ar sem nada em cache, cai no courses.ts para a grade não sumir.
export const getPublicCatalog = cache(async (): Promise<Course[]> => {
  const apiUrl = process.env.API_URL
  if (!apiUrl) return fromStaticData()
  try {
    return await fromApi(apiUrl)
  } catch (error) {
    console.error(
      `Catálogo da API indisponível; usando o courses.ts: ${(error as Error).message}`,
    )
    return fromStaticData()
  }
})
