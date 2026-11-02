import { Inject, Injectable } from '@nestjs/common'
import type {
  CloseSubjectRecordInput,
  SubjectRecordInput,
  SubjectRecordView,
} from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { AcademicRecord } from '../domain/academic-record'
import { AcademicRecordErrors } from '../domain/errors'
import {
  ACADEMIC_RECORD_UOW,
  type AcademicRecordRepositories,
  type AcademicRecordUnitOfWork,
} from '../domain/ports'
import { ownEnrollment, recordViews } from './views'

// Registro de uma matrícula da própria pessoa
async function ownRecord(
  repos: AcademicRecordRepositories,
  userId: string,
  id: string,
) {
  const record = await repos.records.findById(id)
  if (!record) throw AcademicRecordErrors.recordNotFound()
  const enrollment = await repos.enrollments.findById(record.enrollmentId)
  if (enrollment?.userId !== userId) throw AcademicRecordErrors.recordNotFound()
  return { record, enrollment }
}

@Injectable()
export class ListRecordsUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
  ) {}

  execute(userId: string, enrollmentId: string): Promise<SubjectRecordView[]> {
    return this.uow.run(async (repos) => {
      const enrollment = await ownEnrollment(repos, userId, enrollmentId)
      return recordViews(
        repos,
        enrollment,
        await repos.records.listByEnrollment(enrollment.id),
      )
    })
  }
}

// Lança uma tentativa. A disciplina é a do catálogo global: fora da EC, conta
// como optativa livre.
@Injectable()
export class AddRecordUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  execute(
    userId: string,
    enrollmentId: string,
    input: SubjectRecordInput,
  ): Promise<SubjectRecordView> {
    return this.uow.run(async (repos) => {
      const enrollment = await ownEnrollment(repos, userId, enrollmentId)
      const term = await repos.catalog.currentTerm()
      if (!term) throw AcademicRecordErrors.currentTermNotSet()
      const [subject] = await repos.catalog.subjectsByCodes([input.subjectCode])
      if (!subject) throw AcademicRecordErrors.subjectNotFound()
      const sourceRecordId = input.sourceRecordId ?? null
      const history = new AcademicRecord(
        enrollment.id,
        await repos.records.listByEnrollment(enrollment.id),
      )
      const record = history.add(
        {
          id: this.ids.next(),
          subjectId: subject.id,
          subjectCode: subject.code,
          term: input.term,
          status: input.status,
          grade: input.grade ?? null,
          sourceRecordId,
          originNote: input.originNote ?? null,
          now: this.clock.now(),
        },
        term.code,
      )
      if (sourceRecordId) {
        const source = await repos.records.findById(sourceRecordId)
        const owner =
          source && (await repos.enrollments.findById(source.enrollmentId))
        if (owner?.userId !== userId)
          throw AcademicRecordErrors.sourceNotFound()
      }
      await repos.records.insert(record)
      const [view] = await recordViews(repos, enrollment, [record])
      return view!
    })
  }
}

@Injectable()
export class CloseRecordUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(
    userId: string,
    recordId: string,
    input: CloseSubjectRecordInput,
  ): Promise<SubjectRecordView> {
    return this.uow.run(async (repos) => {
      const { record, enrollment } = await ownRecord(repos, userId, recordId)
      const closed = new AcademicRecord(enrollment.id, [record]).close(
        record.id,
        input.status,
        input.grade ?? null,
        this.clock.now(),
      )
      await repos.records.update(closed)
      const [view] = await recordViews(repos, enrollment, [closed])
      return view!
    })
  }
}

@Injectable()
export class DeleteRecordUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
  ) {}

  execute(userId: string, recordId: string): Promise<void> {
    return this.uow.run(async (repos) => {
      const { record } = await ownRecord(repos, userId, recordId)
      await repos.records.delete(record.id)
    })
  }
}
