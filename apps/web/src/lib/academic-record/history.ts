import {
  compareTerms,
  formatTerm,
  parseTerm,
  previousTerm,
  type RecordStatus,
} from '@ufc-flow/academic-core'
import type { SubjectRecordView } from '@ufc-flow/contracts'

export const STATUS_ORDER: RecordStatus[] = [
  'APROVADO',
  'CURSANDO',
  'REPROVADO',
  'TRANCADA',
  'SUPRIMIDA',
  'APROVEITADA',
]

export const STATUS_LABELS: Record<RecordStatus, string> = {
  CURSANDO: 'Cursando',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  TRANCADA: 'Trancada',
  SUPRIMIDA: 'Suprimida',
  APROVEITADA: 'Aproveitada',
}

// Dicas do painel "Registrar disciplina" (mockup Historico)
export const STATUS_HINTS: Record<RecordStatus, string> = {
  CURSANDO: 'Só no semestre vigente. Ao fim dele, feche a situação.',
  APROVADO: 'Encerra a disciplina. A nota é opcional.',
  REPROVADO: 'Permite nova tentativa num semestre posterior.',
  TRANCADA: 'Sem nota. Permite nova tentativa num semestre posterior.',
  SUPRIMIDA: 'Sem nota. Permite nova tentativa num semestre posterior.',
  APROVEITADA: 'Encerra a disciplina sem passar por Cursando.',
}

export const NATURE_LABELS: Record<SubjectRecordView['nature'], string> = {
  MANDATORY: 'Obrigatória',
  OPTATIVE: 'Optativa',
  FREE: 'Livre',
}

const GRADED = new Set<RecordStatus>(['APROVADO', 'REPROVADO', 'APROVEITADA'])
const RETRY = new Set<RecordStatus>(['REPROVADO', 'TRANCADA', 'SUPRIMIDA'])
const DONE = new Set<RecordStatus>(['APROVADO', 'APROVEITADA'])

export const acceptsGrade = (status: RecordStatus) => GRADED.has(status)

const byTerm = (a: string, b: string) =>
  compareTerms(parseTerm(a)!, parseTerm(b)!)

export function statusCounts(records: readonly SubjectRecordView[]) {
  const counts = new Map<RecordStatus, number>()
  for (const record of records) {
    counts.set(record.status, (counts.get(record.status) ?? 0) + 1)
  }
  return counts
}

export type TermGroup = {
  term: string
  isCurrent: boolean
  records: SubjectRecordView[]
  hours: number
  approved: number
  average: number | null
  // Situações além de aprovado, para o resumo dos recolhidos
  others: [RecordStatus, number][]
}

// Semestres do mais novo para o mais antigo, com o resumo de cada um
export function groupByTerm(
  records: readonly SubjectRecordView[],
  currentTerm: string | null,
): TermGroup[] {
  const terms = [...new Set(records.map((record) => record.term))].sort(
    (a, b) => byTerm(b, a),
  )
  return terms.map((term) => {
    const items = records.filter((record) => record.term === term)
    const grades = items
      .map((record) => record.grade)
      .filter((grade): grade is number => grade !== null)
    const counts = statusCounts(items)
    return {
      term,
      isCurrent: term === currentTerm,
      records: items,
      hours: items.reduce((total, record) => total + record.workloadHours, 0),
      approved: counts.get('APROVADO') ?? 0,
      average: grades.length
        ? Math.round(
            (grades.reduce((total, grade) => total + grade, 0) /
              grades.length) *
              10,
          ) / 10
        : null,
      others: STATUS_ORDER.filter((status) => status !== 'APROVADO').flatMap(
        (status): [RecordStatus, number][] =>
          counts.get(status) ? [[status, counts.get(status)!]] : [],
      ),
    }
  })
}

// Reprovado, trancada ou suprimida sem tentativa depois e sem aprovação
export function canRetry(
  record: SubjectRecordView,
  records: readonly SubjectRecordView[],
): boolean {
  if (!RETRY.has(record.status)) return false
  return !records.some(
    (other) =>
      other.subjectCode === record.subjectCode &&
      other.id !== record.id &&
      (DONE.has(other.status) ||
        other.status === 'CURSANDO' ||
        byTerm(other.term, record.term) > 0),
  )
}

// Última tentativa de uma disciplina, para o painel de registro
export function lastAttempt(
  records: readonly SubjectRecordView[],
  subjectCode: string,
): SubjectRecordView | null {
  return (
    records
      .filter((record) => record.subjectCode === subjectCode)
      .sort((a, b) => byTerm(b.term, a.term))[0] ?? null
  )
}

// Semestres que o registro aceita: do vigente para trás, até o ingresso
// (ou até 7 anos quando a matrícula não informa)
export function termOptions(
  currentTerm: string,
  entryTerm: string | null,
): string[] {
  const options: string[] = []
  let term = parseTerm(currentTerm)!
  const floor = entryTerm ? parseTerm(entryTerm) : null
  while (options.length < 14) {
    options.push(formatTerm(term))
    if (floor && compareTerms(term, floor) <= 0) break
    term = previousTerm(term)
  }
  return options
}

const hoursFormat = new Intl.NumberFormat('pt-BR')
const gradeFormat = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

export const formatHours = (hours: number) => hoursFormat.format(hours)
export const formatGrade = (grade: number) => gradeFormat.format(grade)

// "8,5" ou "8.5" vira 8.5; vazio vira null
export function parseGrade(text: string): number | null | undefined {
  const value = text.trim().replace(',', '.')
  if (value === '') return null
  const grade = Number(value)
  return Number.isFinite(grade) ? grade : undefined
}

// Períodos que faltam no ritmo médio da EC
export function periodsLeft(
  remainingHours: number,
  avgPeriodHours: number | null,
): number | null {
  if (!avgPeriodHours || remainingHours <= 0) return null
  return Math.ceil(remainingHours / avgPeriodHours)
}

// "12/12" a partir de "2026-12-12"
export const dayMonth = (isoDate: string) =>
  `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`
