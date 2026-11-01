// Termo letivo, como "2026.1". A UFC tem dois períodos regulares por ano.
export type TermPeriod = 1 | 2

export type Term = {
  year: number
  period: TermPeriod
}

const TERM_PATTERN = /^([1-9]\d{3})\.([12])$/

export function parseTerm(code: string): Term | null {
  const match = TERM_PATTERN.exec(code)
  if (!match) return null
  return { year: Number(match[1]), period: Number(match[2]) as TermPeriod }
}

export function formatTerm(term: Term): string {
  return `${term.year}.${term.period}`
}

// Negativo se a vem antes de b, zero se iguais, positivo se depois
export function compareTerms(a: Term, b: Term): number {
  return a.year - b.year || a.period - b.period
}

export function isSameTerm(a: Term, b: Term): boolean {
  return compareTerms(a, b) === 0
}

export function nextTerm(term: Term): Term {
  return term.period === 1
    ? { year: term.year, period: 2 }
    : { year: term.year + 1, period: 1 }
}

export function previousTerm(term: Term): Term {
  return term.period === 2
    ? { year: term.year, period: 1 }
    : { year: term.year - 1, period: 2 }
}
