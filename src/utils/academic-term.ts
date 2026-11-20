export type AcademicTerm = { year: number; semester: 1 | 2 }

// Primeiro semestre com turmas no seletor da agenda
export const FIRST_SELECTABLE_YEAR = 2022

const compareTerms = (a: AcademicTerm, b: AcademicTerm) =>
  a.year - b.year || a.semester - b.semester

const fromEnv = (): AcademicTerm | null => {
  const year = Number(process.env.NEXT_PUBLIC_CURRENT_YEAR)
  const semester = Number(process.env.NEXT_PUBLIC_CURRENT_SEMESTER)
  if (!Number.isInteger(year) || (semester !== 1 && semester !== 2)) {
    return null
  }
  return { year, semester }
}

// Semestre pela data: janeiro a julho é o .1, agosto a dezembro o .2
const fromDate = (now: Date): AcademicTerm => ({
  year: now.getFullYear(),
  semester: now.getMonth() < 7 ? 1 : 2,
})

// Semestre corrente: o configurado no ambiente ou o da data, o que for mais
// recente (uma variável esquecida não prende o seletor no passado)
export function currentAcademicTerm(now = new Date()): AcademicTerm {
  const configured = fromEnv()
  const byDate = fromDate(now)
  return configured && compareTerms(configured, byDate) > 0
    ? configured
    : byDate
}

export function nextAcademicTerm(term: AcademicTerm): AcademicTerm {
  return term.semester === 1
    ? { year: term.year, semester: 2 }
    : { year: term.year + 1, semester: 1 }
}

// Último semestre que o seletor oferece: sempre o seguinte ao corrente, que
// costuma ter as disciplinas publicadas antes de começar
export function lastSelectableTerm(now = new Date()): AcademicTerm {
  return nextAcademicTerm(currentAcademicTerm(now))
}

// Do último selecionável ao primeiro ano com turmas, do mais novo ao mais
// antigo
export function selectableTerms(now = new Date()): AcademicTerm[] {
  const terms: AcademicTerm[] = []
  let term = lastSelectableTerm(now)
  while (term.year >= FIRST_SELECTABLE_YEAR) {
    terms.push(term)
    term =
      term.semester === 2
        ? { year: term.year, semester: 1 }
        : { year: term.year - 1, semester: 2 }
  }
  return terms
}
