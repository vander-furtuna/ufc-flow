import {
  lastSelectableTerm as lastTerm,
  selectableTerms as terms,
  type Term,
} from '@ufc-flow/academic-core'

import type { CurrentTerm } from '@/lib/classes/classes-api'

// Primeiro semestre com turmas no seletor da agenda
export const FIRST_SELECTABLE_YEAR = 2022

export type AcademicTerm = { year: number; semester: 1 | 2 }

// A regra mora no academic-core (semestre seguinte ao vigente); aqui só se
// troca o formato do web ({ year, semester }) pelo do pacote
const toTerm = (term: CurrentTerm | null): Term | null =>
  term && (term.semester === 1 || term.semester === 2)
    ? { year: term.year, period: term.semester }
    : null
const fromTerm = (term: Term): AcademicTerm => ({
  year: term.year,
  semester: term.period,
})

export function lastSelectableTerm(
  official: CurrentTerm | null,
  now = new Date(),
): AcademicTerm {
  return fromTerm(lastTerm(toTerm(official), now))
}

export function selectableTerms(
  official: CurrentTerm | null,
  now = new Date(),
): AcademicTerm[] {
  return terms(toTerm(official), now, FIRST_SELECTABLE_YEAR).map(fromTerm)
}
