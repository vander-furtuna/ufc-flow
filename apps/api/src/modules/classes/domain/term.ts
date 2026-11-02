import { parseTerm } from '@ufc-flow/academic-core'

import { ClassesErrors } from './errors'

export type AcademicTerm = {
  id: string
  code: string
  year: number
  period: 1 | 2
  // Datas sem hora (YYYY-MM-DD)
  startsAt: string
  endsAt: string
  isCurrent: boolean
}

export function newTerm(
  input: { code: string; startsAt: string; endsAt: string },
  id: string,
): AcademicTerm {
  const parsed = parseTerm(input.code)
  if (!parsed || input.startsAt >= input.endsAt) {
    throw ClassesErrors.termInvalid()
  }
  return {
    id,
    code: input.code,
    year: parsed.year,
    period: parsed.period,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isCurrent: false,
  }
}

// Janela da matrícula: o semestre que começa nos próximos 45 dias também é
// coletado (D68)
const ENROLLMENT_WINDOW_DAYS = 45

const toDate = (day: string) => new Date(`${day}T00:00:00Z`)

export function collectableTerms(
  terms: readonly AcademicTerm[],
  now: Date,
): AcademicTerm[] {
  const windowEnd = new Date(
    now.getTime() + ENROLLMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  )
  return terms
    .filter(
      (term) =>
        term.isCurrent ||
        (toDate(term.startsAt) > now && toDate(term.startsAt) <= windowEnd),
    )
    .sort((a, b) => a.code.localeCompare(b.code))
}
