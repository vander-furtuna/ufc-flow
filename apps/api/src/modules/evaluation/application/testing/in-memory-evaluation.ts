import type { RecordStatus } from '@ufc-flow/academic-core'

import type { Criterion } from '../../domain/evaluation'
import type {
  Evaluation,
  EvaluationRepositories,
  EvaluationUnitOfWork,
} from '../../domain/ports'

const clone = <T>(value: T): T => structuredClone(value)

// Portas em memória, com as mesmas regras do SQL
export class InMemoryEvaluation implements EvaluationUnitOfWork {
  criteria: Criterion[] = []
  evaluations: Evaluation[] = []
  subjects: { id: string; code: string; name: string }[] = []
  records: {
    userId: string
    subjectId: string
    status: RecordStatus
    termCode: string
  }[] = []
  emails = new Map<string, string>()

  repositories(): EvaluationRepositories {
    return {
      criteria: {
        list: async () => clone(this.criteria),
        findById: async (id) =>
          clone(this.criteria.find((item) => item.id === id) ?? null),
        keyTaken: async (key, exceptId) =>
          this.criteria.some(
            (item) => item.key === key && item.id !== exceptId,
          ),
        save: async (criterion) => {
          this.criteria = [
            ...this.criteria.filter((item) => item.id !== criterion.id),
            clone(criterion),
          ]
        },
      },
      evaluations: {
        findMine: async (userId, subjectId) =>
          clone(
            this.evaluations.find(
              (item) => item.userId === userId && item.subjectId === subjectId,
            ) ?? null,
          ),
        save: async (evaluation) => {
          this.evaluations = [
            ...this.evaluations.filter((item) => item.id !== evaluation.id),
            clone(evaluation),
          ]
        },
      },
      reader: {
        totals: async (subjectId) => {
          const mine = this.evaluations.filter(
            (item) => item.subjectId === subjectId,
          )
          return {
            total: mine.length,
            scores: mine.flatMap((item) => clone(item.scores)),
          }
        },
      },
      directory: {
        subjectByCode: async (code) =>
          this.subjects.find((item) => item.code === code) ?? null,
        records: async (userId, subjectId) =>
          this.records
            .filter(
              (item) => item.userId === userId && item.subjectId === subjectId,
            )
            .map(({ status, termCode }) => ({ status, termCode })),
        email: async (userId) => this.emails.get(userId) ?? null,
      },
    }
  }

  run<T>(work: (repositories: EvaluationRepositories) => Promise<T>) {
    return work(this.repositories())
  }
}
