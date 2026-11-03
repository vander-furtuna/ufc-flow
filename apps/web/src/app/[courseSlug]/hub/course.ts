import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getPublicCatalog } from '@/lib/catalog/public-catalog'

import type { HubCourse } from './hub-page'

// Curso do hub pelo catálogo público, com a EC vigente para as pílulas e a
// aba Grade. Sem API_URL o hub não existe (D51).
export const hubCourse = cache(async (slug: string): Promise<HubCourse> => {
  if (!process.env.API_URL) notFound()
  const course = (await getPublicCatalog()).find((item) => item.slug === slug)
  if (!course) notFound()
  const curriculum =
    course.curriculumStructures.find((item) => item.isCurrent) ??
    course.curriculumStructures[0]
  return {
    slug: course.slug,
    name: course.name,
    curriculum: curriculum
      ? {
          slug: curriculum.slug,
          period: curriculum.period,
          city: curriculum.city,
        }
      : null,
  }
})
