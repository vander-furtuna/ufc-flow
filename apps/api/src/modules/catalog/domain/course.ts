import {
  matchSigaaCourse,
  normalizeSearchText,
  type SigaaCourse,
} from '@ufc-flow/academic-core'
import type { CurriculumImportV1 } from '@ufc-flow/contracts'

import { CatalogErrors } from './errors'

export type Course = {
  id: string
  sigaaId: string
  slug: string
  name: string
  icon: string
  color: string | null
  campusId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type Campus = {
  id: string
  slug: string
  name: string
  city: string
  state: string
}

const LOWERCASE_WORDS = new Set(['da', 'das', 'de', 'do', 'dos', 'e', 'em'])

// "CAMPUS DA UFC EM SOBRAL" vira "Campus da UFC em Sobral": preposições em
// minúsculas e siglas curtas (UFC) como estão
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word
      if (word.length <= 3 && index > 0) return word.toUpperCase()
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export const slugify = (text: string) =>
  normalizeSearchText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Campus de um curso do SIGAA: um por cidade. Unidades de campus do
// interior ("CAMPUS DA UFC EM SOBRAL") dão o nome; nas demais (centros de
// Fortaleza) fica "UFC em <cidade>".
export function campusForSigaaCourse(course: SigaaCourse): Omit<Campus, 'id'> {
  const city = titleCase(course.city)
  const unit = course.unitName ?? ''
  return {
    slug: slugify(course.city),
    name: /^campus\b/i.test(unit) ? titleCase(unit) : `UFC em ${city}`,
    city,
    state: 'CE',
  }
}

// Confere o curso informado pela extensão contra a matriz, a unidade e a
// cidade do arquivo (D34). Escolha manual do usuário vale como está.
export function checkImportCourse(
  payload: CurriculumImportV1,
  course: SigaaCourse,
): void {
  if (payload.course.recognition === 'MANUAL') return
  const match = matchSigaaCourse(
    {
      matrixName: payload.curriculum.matrixName,
      unitName: payload.curriculum.unitName,
      city: payload.curriculum.city,
    },
    [course],
  )
  if (match.status === 'NOT_FOUND') throw CatalogErrors.courseMismatch()
}

export function checkCourseDeletion(publishedCurricula: number): void {
  if (publishedCurricula > 0) throw CatalogErrors.courseHasPublishedCurricula()
}
