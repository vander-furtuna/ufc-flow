import { Inject, Injectable } from '@nestjs/common'
import {
  completedSubjectCodes,
  computeProgress,
  findAvailableSubjects,
  findStaleInProgress,
  isCloseReminderDue,
  parseTerm,
} from '@ufc-flow/academic-core'
import type {
  AcademicSummary,
  AvailableSubjectView,
  ProgressView,
} from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import type { Activity, ActivityCategory } from '../domain/activity'
import {
  ACADEMIC_RECORD_UOW,
  type AcademicRecordUnitOfWork,
  type CurriculumSnapshot,
} from '../domain/ports'
import {
  ownEnrollment,
  stripExtension,
  toCategoryView,
  toEnrollmentView,
  toRecordViews,
  type RecordWithSubject,
} from './views'

const COMPLETED = new Set(['APROVADO', 'APROVEITADA'])

// Progresso do academic-core, com nome, tipo e tamanho de cada vertente
export function progressOf(
  snapshot: CurriculumSnapshot,
  records: readonly RecordWithSubject[],
  activities: readonly Activity[],
  categories: readonly ActivityCategory[],
): ProgressView {
  // A exigência de complementares é a carga do componente da EC (D40)
  const component = snapshot.subjects.find(
    (subject) => subject.type === 'COMPLEMENTARY_ACTIVITY',
  )
  const progress = computeProgress({
    curriculum: {
      mandatoryHours: snapshot.mandatoryHours,
      optativeHours: snapshot.optativeHours,
      maxFreeOptativeHours: snapshot.maxFreeOptativeHours,
      complementaryComponentCode: component?.code ?? null,
      extensionHours: snapshot.extensionHours,
      minTotalHours: snapshot.minTotalHours,
      minEmphases: snapshot.minEmphases,
      maxEmphases: snapshot.maxEmphases,
      subjects: snapshot.subjects,
      branches: snapshot.branches,
      activityCategories: categories,
    },
    completedSubjects: records
      .filter((record) => COMPLETED.has(record.status))
      .map((record) => ({
        code: record.subjectCode,
        workloadHours: record.workloadHours,
        extensionHours: record.extensionHours,
      })),
    activities,
    equivalences: snapshot.equivalences,
  })
  const branches = new Map(
    snapshot.branches.map((branch) => [branch.id, branch]),
  )
  return {
    ...progress,
    branches: progress.branches.map((item) => {
      const branch = branches.get(item.branchId)!
      // As subvertentes contam também para a vertente-mãe
      const ids = new Set([
        branch.id,
        ...snapshot.branches
          .filter((child) => child.parentId === branch.id)
          .map((child) => child.id),
      ])
      return {
        ...item,
        name: branch.name,
        type: branch.type,
        color: branch.color,
        parentId: branch.parentId,
        totalComponents: snapshot.subjects.filter((subject) =>
          subject.branchIds.some((id) => ids.has(id)),
        ).length,
      }
    }),
  }
}

// Liberadas da EC, por semestre sugerido. O componente de complementares não
// é cursado: sai da lista.
export function availableOf(
  snapshot: CurriculumSnapshot,
  records: readonly RecordWithSubject[],
): AvailableSubjectView[] {
  const subjects = snapshot.subjects.filter(
    (subject) => subject.type !== 'COMPLEMENTARY_ACTIVITY',
  )
  const byCode = new Map(subjects.map((subject) => [subject.code, subject]))
  return findAvailableSubjects({
    subjects,
    completedCodes: completedSubjectCodes(records),
    inProgressCodes: new Set(
      records
        .filter((record) => record.status === 'CURSANDO')
        .map((record) => record.subjectCode),
    ),
    equivalences: snapshot.equivalences,
  })
    .map(({ code, missingCorequisites }) => {
      const subject = byCode.get(code)!
      return {
        code,
        name: subject.name,
        semester: subject.semester,
        nature: subject.nature,
        workloadHours: subject.workloadHours,
        missingCorequisites,
      }
    })
    .sort(
      (a, b) =>
        (a.semester ?? Infinity) - (b.semester ?? Infinity) ||
        a.code.localeCompare(b.code),
    )
}

// Tudo da Minha área numa leitura, calculado sob demanda
@Injectable()
export class GetAcademicSummaryUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(userId: string, enrollmentId: string): Promise<AcademicSummary> {
    return this.uow.run(async (repos) => {
      const enrollment = await ownEnrollment(repos, userId, enrollmentId)
      const snapshot = await repos.catalog.snapshot(enrollment.curriculumId)
      const stored = await repos.records.listByEnrollment(enrollment.id)
      const records = toRecordViews(
        stored,
        await repos.catalog.subjectsByIds([
          ...new Set(stored.map((record) => record.subjectId)),
        ]),
        snapshot,
      )
      const activities = await repos.activities.listByEnrollment(enrollment.id)
      const categories = await repos.categories.listByCurriculum(
        enrollment.curriculumId,
      )
      const term = await repos.catalog.currentTerm()
      const current = term ? parseTerm(term.code)! : null

      const open = records.filter((record) => record.status === 'CURSANDO')
      // CURSANDO de semestres anteriores ao vigente: o aluno precisa fechar
      const staleIds = new Set(
        current
          ? findStaleInProgress(
              open.map((record) => ({
                ...record,
                term: parseTerm(record.term)!,
              })),
              current,
            ).map((record) => record.id)
          : [],
      )
      const inProgress = open.filter((record) => !staleIds.has(record.id))
      const stale = open.filter((record) => staleIds.has(record.id))

      return {
        enrollment: await toEnrollmentView(repos, enrollment),
        currentTerm: term,
        avgPeriodHours: snapshot.periodAvgHours,
        progress: progressOf(snapshot, records, activities, categories),
        inProgress: inProgress.map(stripExtension),
        staleInProgress: stale.map(stripExtension),
        closeReminderDue: isCloseReminderDue({
          inProgressCount: inProgress.length,
          staleCount: stale.length,
          termEndsAt: term?.endsAt ?? null,
          today: this.clock.now().toISOString().slice(0, 10),
        }),
        available: availableOf(snapshot, records),
        categories: categories.map(toCategoryView),
      }
    })
  }
}
