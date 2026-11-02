import { collectCodes } from '@ufc-flow/academic-core'
import { Inject, Injectable } from '@nestjs/common'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import type { Course } from '../domain/course'
import type { Curriculum } from '../domain/curriculum'
import {
  applyIncoming,
  curriculumFromImport,
  planImport,
} from '../domain/curriculum-import'
import type { CatalogRepositories, CurriculumImport } from '../domain/ports'
import { setEquivalences, type Subject } from '../domain/subject'

// Transforma uma importação recebida em EC: cria as disciplinas que faltam,
// aplica as equivalências (admin) ou as deixa como sugestão (moderador) e
// grava a EC como rascunho, ou aplica o arquivo sobre a que já existe.
@Injectable()
export class ImportApplier {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async apply(
    repos: CatalogRepositories,
    record: CurriculumImport,
    course: Course,
  ): Promise<{ record: CurriculumImport; curriculum: Curriculum }> {
    const now = this.clock.now()
    const newId = () => this.ids.next()
    const { payload } = record
    const cited = payload.subjects.flatMap((item) => [
      item.code,
      ...collectCodes(item.prerequisites),
      ...collectCodes(item.corequisites),
    ])
    const catalog = await repos.subjects.findByCodes([...new Set(cited)])
    const importedByAdmin = record.importedBy
      ? await repos.users.isAdmin(record.importedBy)
      : false

    const plan = planImport(payload, {
      catalog,
      importId: record.id,
      importedByAdmin,
      newId,
      now,
    })
    await repos.subjects.insertMany(plan.newSubjects)

    const byCode = new Map<string, Subject>([
      ...catalog,
      ...plan.newSubjects.map((item) => [item.code, item] as const),
    ])
    for (const update of plan.equivalenceUpdates) {
      const subject = byCode.get(update.code) as Subject
      await repos.subjects.update(
        setEquivalences(subject, update.equivalences, now),
      )
    }

    const existing = await repos.curricula.findByCode(
      course.id,
      payload.curriculum.code,
    )
    const incoming = curriculumFromImport(payload, {
      id: existing?.id ?? newId(),
      courseId: course.id,
      subjectIdOf: (code) => (byCode.get(code) as Subject).id,
      newId,
      now,
    })

    let curriculum = incoming
    if (existing) {
      const locked =
        existing.status === 'PUBLISHED' &&
        (await repos.enrollments.countForCurriculum(existing.id)) > 0
      curriculum = {
        ...applyIncoming(existing, incoming, { locked }),
        needsReimport: false,
        updatedAt: now,
      }
      if (existing.status === 'PUBLISHED') {
        await repos.audit.record({
          id: newId(),
          actorId: record.importedBy,
          entity: 'curriculum',
          entityId: existing.id,
          action: 'curriculum.reimported',
          changes: { importId: record.id },
          createdAt: now,
        })
      }
    }
    await repos.curricula.save(curriculum)

    const applied: CurriculumImport = {
      ...record,
      courseId: course.id,
      curriculumId: curriculum.id,
      status: 'APPLIED',
      reviewPoints: plan.reviewPoints,
      appliedAt: now,
    }
    await repos.imports.update(applied)
    return { record: applied, curriculum }
  }
}
