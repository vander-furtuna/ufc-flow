import { Inject, Injectable } from '@nestjs/common'
import type { RecordStatus } from '@ufc-flow/academic-core'
import { and, count, eq, ne } from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import type { Executor } from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import {
  studentEnrollments,
  studentSubjectRecords,
} from '../../../academic-record/infrastructure/persistence/academic-record.schema'
import { subjects } from '../../../catalog/infrastructure/persistence/catalog.schema'
import {
  auditLogs,
  users,
} from '../../../identity/infrastructure/persistence/identity.schema'
import type {
  EvaluationRepositories,
  EvaluationUnitOfWork,
} from '../../domain/ports'
import {
  evaluationCriteria,
  subjectEvaluationScores,
  subjectEvaluations,
} from './evaluation.schema'

function evaluationRepositories(db: Executor): EvaluationRepositories {
  return {
    criteria: {
      list: () => db.select().from(evaluationCriteria),
      async findById(id) {
        const [row] = await db
          .select()
          .from(evaluationCriteria)
          .where(eq(evaluationCriteria.id, id))
        return row ?? null
      },
      async keyTaken(key, exceptId) {
        const [row] = await db
          .select({ id: evaluationCriteria.id })
          .from(evaluationCriteria)
          .where(
            and(
              eq(evaluationCriteria.key, key),
              exceptId ? ne(evaluationCriteria.id, exceptId) : undefined,
            ),
          )
        return Boolean(row)
      },
      async save(criterion) {
        const { id: _id, ...fields } = criterion
        await db
          .insert(evaluationCriteria)
          .values(criterion)
          .onConflictDoUpdate({ target: evaluationCriteria.id, set: fields })
      },
    },
    evaluations: {
      async findMine(userId, subjectId) {
        const [row] = await db
          .select()
          .from(subjectEvaluations)
          .where(
            and(
              eq(subjectEvaluations.userId, userId),
              eq(subjectEvaluations.subjectId, subjectId),
            ),
          )
        if (!row?.userId) return null
        const scores = await db
          .select({
            criterionId: subjectEvaluationScores.criterionId,
            score: subjectEvaluationScores.score,
          })
          .from(subjectEvaluationScores)
          .where(eq(subjectEvaluationScores.evaluationId, row.id))
        return { ...row, userId: row.userId, scores }
      },
      async save(evaluation) {
        const { scores, ...row } = evaluation
        await db
          .insert(subjectEvaluations)
          .values(row)
          .onConflictDoUpdate({
            target: subjectEvaluations.id,
            set: { updatedAt: row.updatedAt },
          })
        await db
          .delete(subjectEvaluationScores)
          .where(eq(subjectEvaluationScores.evaluationId, row.id))
        await db
          .insert(subjectEvaluationScores)
          .values(scores.map((score) => ({ evaluationId: row.id, ...score })))
      },
      async deleteAllOf(userId) {
        // As notas saem em cascata
        const rows = await db
          .delete(subjectEvaluations)
          .where(eq(subjectEvaluations.userId, userId))
          .returning({ id: subjectEvaluations.id })
        return rows.length
      },
    },
    reader: {
      async totals(subjectId) {
        const [row] = await db
          .select({ total: count() })
          .from(subjectEvaluations)
          .where(eq(subjectEvaluations.subjectId, subjectId))
        // Só as notas, sem quem deu
        const scores = await db
          .select({
            criterionId: subjectEvaluationScores.criterionId,
            score: subjectEvaluationScores.score,
          })
          .from(subjectEvaluationScores)
          .innerJoin(
            subjectEvaluations,
            eq(subjectEvaluations.id, subjectEvaluationScores.evaluationId),
          )
          .where(eq(subjectEvaluations.subjectId, subjectId))
        return { total: row?.total ?? 0, scores }
      },
    },
    directory: {
      async subjectByCode(code) {
        const [row] = await db
          .select({ id: subjects.id, code: subjects.code, name: subjects.name })
          .from(subjects)
          .where(eq(subjects.code, code))
        return row ?? null
      },
      async records(userId, subjectId) {
        const rows = await db
          .select({
            status: studentSubjectRecords.status,
            termCode: studentSubjectRecords.termCode,
          })
          .from(studentSubjectRecords)
          .innerJoin(
            studentEnrollments,
            eq(studentEnrollments.id, studentSubjectRecords.enrollmentId),
          )
          .where(
            and(
              eq(studentEnrollments.userId, userId),
              eq(studentSubjectRecords.subjectId, subjectId),
            ),
          )
        return rows.map((row) => ({
          status: row.status as RecordStatus,
          termCode: row.termCode,
        }))
      },
      async email(userId) {
        const [row] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, userId))
        return row?.email ?? null
      },
    },
    audit: {
      async record(entry) {
        await db.insert(auditLogs).values({
          ...entry,
          module: 'evaluation',
          entity: 'user',
        })
      },
    },
  }
}

@Injectable()
export class DrizzleEvaluationUnitOfWork implements EvaluationUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repositories: EvaluationRepositories) => Promise<T>) {
    return this.db.transaction((tx) => work(evaluationRepositories(tx)))
  }
}
