import { compareTerms, nextTerm, previousTerm, type Term } from './term'

// Semestre pela data: janeiro a julho é o .1, agosto a dezembro o .2
export function termOfDate(date: Date): Term {
  return { year: date.getFullYear(), period: date.getMonth() < 7 ? 1 : 2 }
}

// Último semestre dos seletores: o seguinte ao vigente, que costuma ter as
// disciplinas publicadas antes de começar. Vigente é o marcado (API ou
// ambiente) ou o da data, o que for mais recente: um vigente esquecido não
// prende o seletor no passado.
export function lastSelectableTerm(current: Term | null, today: Date): Term {
  const byDate = termOfDate(today)
  const base = current && compareTerms(current, byDate) > 0 ? current : byDate
  return nextTerm(base)
}

// Do último selecionável até o .1 do primeiro ano, do mais novo ao mais
// antigo
export function selectableTerms(
  current: Term | null,
  today: Date,
  firstYear: number,
): Term[] {
  const terms: Term[] = []
  for (
    let term = lastSelectableTerm(current, today);
    term.year >= firstYear;
    term = previousTerm(term)
  ) {
    terms.push(term)
  }
  return terms
}
