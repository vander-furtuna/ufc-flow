import { Inject, Injectable } from '@nestjs/common'
import type {
  ChangeCurriculumInput,
  EnrollmentInput,
  EnrollmentView,
} from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { changeCurriculum, enroll } from '../domain/enrollment'
import { AcademicRecordErrors } from '../domain/errors'
import {
  ACADEMIC_RECORD_UOW,
  type AcademicRecordUnitOfWork,
} from '../domain/ports'
import { ownEnrollment, toEnrollmentView } from './views'

@Injectable()
export class ListEnrollmentsUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
  ) {}

  execute(userId: string): Promise<EnrollmentView[]> {
    return this.uow.run(async (repos) => {
      const enrollments = await repos.enrollments.listByUser(userId)
      const views: EnrollmentView[] = []
      for (const enrollment of enrollments) {
        views.push(await toEnrollmentView(repos, enrollment))
      }
      return views
    })
  }
}

// Matrícula num curso ativo, numa EC publicada. Com a atual em outro curso,
// é transferência interna.
@Injectable()
export class CreateEnrollmentUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  execute(userId: string, input: EnrollmentInput): Promise<EnrollmentView> {
    return this.uow.run(async (repos) => {
      const course = await repos.catalog.findCourse(input.courseSlug)
      if (!course?.isActive) throw AcademicRecordErrors.courseNotFound()
      const curriculum = await repos.catalog.findCurriculum(
        course.id,
        input.curriculumSlug,
      )
      if (!curriculum?.published) {
        throw AcademicRecordErrors.curriculumNotFound()
      }
      const { enrollment, transferred } = enroll({
        current: await repos.enrollments.findCurrent(userId),
        id: this.ids.next(),
        userId,
        courseId: course.id,
        curriculumId: curriculum.id,
        registrationNumber: input.registrationNumber,
        entryTerm: input.entryTerm ?? null,
        currentTerm: (await repos.catalog.currentTerm())?.code ?? null,
        now: this.clock.now(),
      })
      // A antiga deixa de ser a atual antes, pelo índice único parcial
      if (transferred) await repos.enrollments.save(transferred)
      await repos.enrollments.save(enrollment)
      return toEnrollmentView(repos, enrollment)
    })
  }
}

// Migrar de EC no mesmo curso, com registro em audit_logs
@Injectable()
export class ChangeCurriculumUseCase {
  constructor(
    @Inject(ACADEMIC_RECORD_UOW) private readonly uow: AcademicRecordUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  execute(
    userId: string,
    enrollmentId: string,
    input: ChangeCurriculumInput,
  ): Promise<EnrollmentView> {
    return this.uow.run(async (repos) => {
      const enrollment = await ownEnrollment(repos, userId, enrollmentId)
      const curriculum = await repos.catalog.findCurriculum(
        enrollment.courseId,
        input.curriculumSlug,
      )
      if (!curriculum?.published) {
        throw AcademicRecordErrors.curriculumNotFound()
      }
      if (curriculum.id === enrollment.curriculumId) {
        return toEnrollmentView(repos, enrollment)
      }
      const changed = changeCurriculum(
        enrollment,
        curriculum.id,
        this.clock.now(),
      )
      await repos.enrollments.save(changed)
      await repos.activities.clearCategoriesOutside(
        enrollment.id,
        curriculum.id,
      )
      await repos.audit.record({
        id: this.ids.next(),
        actorId: userId,
        entity: 'student_enrollment',
        entityId: enrollment.id,
        action: 'CURRICULUM_CHANGED',
        changes: {
          from: enrollment.curriculumId,
          to: curriculum.id,
        },
      })
      return toEnrollmentView(repos, changed)
    })
  }
}
