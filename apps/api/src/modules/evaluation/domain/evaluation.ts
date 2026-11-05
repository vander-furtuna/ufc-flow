import type { RecordStatus } from '@ufc-flow/academic-core'
import { EVALUATION_MIN_RESPONSES } from '@ufc-flow/contracts'

import { EvaluationErrors } from './errors'

export type Criterion = {
  id: string
  key: string
  label: string
  description: string | null
  lowLabel: string
  highLabel: string
  isActive: boolean
  position: number
}

export type Score = { criterionId: string; score: number }

export type Eligibility = {
  eligible: boolean
  status: 'APROVADO' | 'REPROVADO' | null
  term: string | null
}

const termOrder = (term: string) => {
  const [year, period] = term.split('.').map(Number)
  return (year ?? 0) * 10 + (period ?? 0)
}

// Avalia quem tem APROVADO ou REPROVADO na disciplina (TRANCADA, SUPRIMIDA e
// APROVEITADA não: não foi cursada até o fim na UFC). Mostra o aprovado mais
// recente; sem ele, a reprovação mais recente.
export function eligibilityOf(
  records: readonly { status: RecordStatus; termCode: string }[],
): Eligibility {
  const latest = (status: 'APROVADO' | 'REPROVADO') =>
    records
      .filter((record) => record.status === status)
      .sort((a, b) => termOrder(b.termCode) - termOrder(a.termCode))[0]
  const record = latest('APROVADO') ?? latest('REPROVADO')
  if (!record) return { eligible: false, status: null, term: null }
  return {
    eligible: true,
    status: record.status as 'APROVADO' | 'REPROVADO',
    term: record.termCode,
  }
}

export const isInstitutionalEmail = (email: string) =>
  /@alu\.ufc\.br$/i.test(email.trim())

// Uma nota para cada critério ativo, e só para eles
export function assertScores(
  scores: readonly Score[],
  criteria: readonly Criterion[],
) {
  const active = new Set(
    criteria.filter((item) => item.isActive).map((item) => item.id),
  )
  if (scores.some((item) => !active.has(item.criterionId))) {
    throw EvaluationErrors.unknownCriterion()
  }
  if (scores.length !== active.size) throw EvaluationErrors.incomplete()
}

const round1 = (value: number) => Math.round(value * 10) / 10

// Agregados da leitura: média, contagem e distribuição por critério ativo,
// só com o mínimo de respostas (no total e no critério)
export function summarize(
  total: number,
  scores: readonly Score[],
  criteria: readonly Criterion[],
) {
  const enough = total >= EVALUATION_MIN_RESPONSES
  return {
    enough,
    total: enough ? total : null,
    criteria: criteria
      .filter((item) => item.isActive)
      .sort((a, b) => a.position - b.position)
      .map((item) => {
        const values = scores
          .filter((score) => score.criterionId === item.id)
          .map((score) => score.score)
        const shown = enough && values.length >= EVALUATION_MIN_RESPONSES
        const distribution = [1, 2, 3, 4, 5].map(
          (n) => values.filter((value) => value === n).length,
        )
        return {
          id: item.id,
          key: item.key,
          label: item.label,
          description: item.description,
          lowLabel: item.lowLabel,
          highLabel: item.highLabel,
          mean: shown
            ? round1(
                values.reduce((sum, value) => sum + value, 0) / values.length,
              )
            : null,
          count: shown ? values.length : null,
          distribution: shown ? distribution : null,
        }
      }),
  }
}
