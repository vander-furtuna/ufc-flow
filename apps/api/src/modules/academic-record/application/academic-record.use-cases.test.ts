import { describe, expect, it } from 'vitest'

import type { Actor } from '../../../shared/domain/access-policy'
import { DomainError } from '../../../shared/domain/domain-error'
import {
  SequentialIds,
  SteppingClock,
} from '../../catalog/application/testing/in-memory-catalog'
import type { FileRecord } from '../../files/domain/file'
import {
  CreateActivityUseCase,
  DeleteActivityUseCase,
  ListActivityCategoriesUseCase,
  SaveActivityCategoryUseCase,
  UpdateActivityUseCase,
} from './activities.use-cases'
import {
  ChangeCurriculumUseCase,
  CreateEnrollmentUseCase,
  ListEnrollmentsUseCase,
} from './enrollments.use-cases'
import {
  AddRecordUseCase,
  CloseRecordUseCase,
  DeleteRecordUseCase,
  ListRecordsUseCase,
} from './records.use-cases'
import { GetAcademicSummaryUseCase } from './summary.use-case'
import {
  emptySnapshot,
  InMemoryAcademicRecord,
} from './testing/in-memory-academic-record'

const ANA = 'u-ana'
const BIA = 'u-bia'

const actor = (overrides: Partial<Actor> = {}): Actor => ({
  userId: ANA,
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(),
  ...overrides,
})

const file = (id: string, overrides: Partial<FileRecord> = {}): FileRecord => ({
  id,
  ownerId: ANA,
  courseId: null,
  purpose: 'CERTIFICATE',
  visibility: 'PRIVATE',
  storageKey: `k/${id}`,
  originalName: 'certificado.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 100,
  width: null,
  height: null,
  sha256: 'x',
  status: 'PENDING',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  attachedAt: null,
  deletedAt: null,
  ...overrides,
})

function harness() {
  const store = new InMemoryAcademicRecord()
  const clock = new SteppingClock('2026-11-02T12:00:00.000Z')
  const ids = new SequentialIds()
  store.courses = [
    { id: 'c-eng', slug: 'eng', name: 'Engenharia', isActive: true },
    { id: 'c-cc', slug: 'cc', name: 'Computação', isActive: true },
    { id: 'c-old', slug: 'old', name: 'Antigo', isActive: false },
  ]
  store.curricula = [
    {
      id: 'ec-2006',
      courseId: 'c-eng',
      slug: '2006-2',
      code: '2006.2',
      published: true,
    },
    {
      id: 'ec-2025',
      courseId: 'c-eng',
      slug: '2025-1',
      code: '2025.1',
      published: true,
    },
    {
      id: 'ec-rasc',
      courseId: 'c-eng',
      slug: '2027-1',
      code: '2027.1',
      published: false,
    },
    {
      id: 'ec-cc',
      courseId: 'c-cc',
      slug: '2020-1',
      code: '2020.1',
      published: true,
    },
  ]
  store.subjects = [
    {
      id: 's-1',
      code: 'ECO0001',
      name: 'CÁLCULO',
      workloadHours: 64,
      extensionHours: 0,
    },
    {
      id: 's-2',
      code: 'ECO0002',
      name: 'FÍSICA',
      workloadHours: 64,
      extensionHours: 16,
    },
    {
      id: 's-3',
      code: 'ECO0003',
      name: 'REDES',
      workloadHours: 64,
      extensionHours: 0,
    },
    {
      id: 's-atv',
      code: 'ATV0001',
      name: 'ATIVIDADES',
      workloadHours: 100,
      extensionHours: 0,
    },
    {
      id: 's-free',
      code: 'LIV0001',
      name: 'LIBRAS',
      workloadHours: 32,
      extensionHours: 0,
    },
  ]
  store.snapshots.set('ec-2006', {
    ...emptySnapshot(),
    mandatoryHours: 292,
    optativeHours: 64,
    maxFreeOptativeHours: 32,
    minTotalHours: 356,
    periodAvgHours: 360,
    subjects: [
      {
        code: 'ECO0001',
        name: 'CÁLCULO',
        type: 'DISCIPLINE',
        semester: 1,
        nature: 'MANDATORY',
        workloadHours: 64,
        extensionHours: 0,
        branchIds: [],
        prerequisite: null,
        corequisite: null,
      },
      {
        code: 'ECO0002',
        name: 'FÍSICA',
        type: 'DISCIPLINE',
        semester: 2,
        nature: 'MANDATORY',
        workloadHours: 64,
        extensionHours: 16,
        branchIds: [],
        prerequisite: { kind: 'subject', code: 'ECO0001' },
        corequisite: null,
      },
      {
        code: 'ECO0003',
        name: 'REDES',
        type: 'DISCIPLINE',
        semester: 5,
        nature: 'OPTATIVE',
        workloadHours: 64,
        extensionHours: 0,
        branchIds: ['b-redes'],
        prerequisite: null,
        corequisite: { kind: 'subject', code: 'ECO0002' },
      },
      {
        code: 'ATV0001',
        name: 'ATIVIDADES',
        type: 'COMPLEMENTARY_ACTIVITY',
        semester: null,
        nature: 'MANDATORY',
        workloadHours: 100,
        extensionHours: 0,
        branchIds: [],
        prerequisite: null,
        corequisite: null,
      },
    ],
    branches: [
      {
        id: 'b-redes',
        parentId: null,
        type: 'EMPHASIS',
        name: 'Redes',
        color: '#0ea5e9',
        minHours: 64,
        maxHours: null,
        minComponents: null,
        maxComponents: null,
      },
    ],
  })
  store.term = { code: '2026.2', endsAt: '2026-12-11' }
  const deps = [store, clock, ids] as const
  return {
    store,
    clock,
    list: new ListEnrollmentsUseCase(store),
    create: new CreateEnrollmentUseCase(...deps),
    change: new ChangeCurriculumUseCase(...deps),
    listRecords: new ListRecordsUseCase(store),
    addRecord: new AddRecordUseCase(...deps),
    closeRecord: new CloseRecordUseCase(store, clock),
    deleteRecord: new DeleteRecordUseCase(store),
    createActivity: new CreateActivityUseCase(...deps),
    updateActivity: new UpdateActivityUseCase(store, clock),
    deleteActivity: new DeleteActivityUseCase(store, clock),
    listCategories: new ListActivityCategoriesUseCase(store),
    categories: new SaveActivityCategoryUseCase(store, ids),
    summary: new GetAcademicSummaryUseCase(store, clock),
  }
}

const enrollmentInput = {
  courseSlug: 'eng',
  curriculumSlug: '2006-2',
  registrationNumber: '512345',
  entryTerm: '2023.1',
}

async function rejects(work: Promise<unknown>) {
  try {
    await work
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  throw new Error('esperava um DomainError')
}

describe('matrículas', () => {
  it('cria a matrícula e lista a atual primeiro', async () => {
    const h = harness()
    const first = await h.create.execute(ANA, enrollmentInput)
    expect(first).toMatchObject({
      course: { slug: 'eng' },
      curriculum: { slug: '2006-2', code: '2006.2' },
      status: 'ACTIVE',
      isCurrent: true,
    })
    const second = await h.create.execute(ANA, {
      ...enrollmentInput,
      courseSlug: 'cc',
      curriculumSlug: '2020-1',
      registrationNumber: '600001',
    })
    const listed = await h.list.execute(ANA)
    expect(listed.map((item) => [item.id, item.status])).toEqual([
      [second.id, 'ACTIVE'],
      [first.id, 'TRANSFERRED'],
    ])
    expect(await h.list.execute(BIA)).toEqual([])
  })

  it.each([
    [{ courseSlug: 'nada' }, 'COURSE_NOT_FOUND'],
    [{ courseSlug: 'old' }, 'COURSE_NOT_FOUND'],
    [{ curriculumSlug: '2027-1' }, 'CURRICULUM_NOT_FOUND'],
    [{ curriculumSlug: '2020-1' }, 'CURRICULUM_NOT_FOUND'],
    [{ entryTerm: '2027.1' }, 'ENROLLMENT_ENTRY_TERM_IN_FUTURE'],
  ])('recusa %o', async (overrides, code) => {
    const h = harness()
    expect(
      await rejects(
        h.create.execute(ANA, { ...enrollmentInput, ...overrides }),
      ),
    ).toBe(code)
  })

  it('migra de EC no mesmo curso, com auditoria', async () => {
    const h = harness()
    const created = await h.create.execute(ANA, enrollmentInput)
    h.store.categories.set('cat-old', {
      id: 'cat-old',
      curriculumId: 'ec-2006',
      kind: 'COMPLEMENTARY',
      name: 'Monitoria',
      maxHours: 60,
      position: 0,
    })
    const activity = await h.createActivity.execute(ANA, created.id, {
      kind: 'COMPLEMENTARY',
      categoryId: 'cat-old',
      title: 'Monitoria',
      hours: 30,
      startedOn: '2025-03-01',
    })

    const same = await h.change.execute(ANA, created.id, {
      curriculumSlug: '2006-2',
    })
    expect(same.curriculum.slug).toBe('2006-2')
    expect(h.store.audit).toHaveLength(0)

    const changed = await h.change.execute(ANA, created.id, {
      curriculumSlug: '2025-1',
    })
    expect(changed.curriculum.slug).toBe('2025-1')
    expect(h.store.audit).toEqual([
      expect.objectContaining({
        entity: 'student_enrollment',
        action: 'CURRICULUM_CHANGED',
        changes: { from: 'ec-2006', to: 'ec-2025' },
      }),
    ])
    expect(h.store.activities.get(activity.id)?.categoryId).toBeNull()
    expect(
      await rejects(
        h.change.execute(ANA, created.id, { curriculumSlug: '2027-1' }),
      ),
    ).toBe('CURRICULUM_NOT_FOUND')
    expect(
      await rejects(
        h.change.execute(BIA, created.id, { curriculumSlug: '2025-1' }),
      ),
    ).toBe('ENROLLMENT_NOT_FOUND')
  })
})

describe('histórico', () => {
  async function enrolled() {
    const h = harness()
    const enrollment = await h.create.execute(ANA, enrollmentInput)
    return { ...h, enrollmentId: enrollment.id }
  }

  it('lança, fecha e exclui registros', async () => {
    const h = await enrolled()
    const free = await h.addRecord.execute(ANA, h.enrollmentId, {
      subjectCode: 'LIV0001',
      term: '2025.1',
      status: 'APROVADO',
      grade: 9,
    })
    expect(free).toMatchObject({ nature: 'FREE', subjectName: 'LIBRAS' })
    const open = await h.addRecord.execute(ANA, h.enrollmentId, {
      subjectCode: 'ECO0001',
      term: '2026.2',
      status: 'CURSANDO',
    })
    expect(open).toMatchObject({ nature: 'MANDATORY', grade: null })

    const closed = await h.closeRecord.execute(ANA, open.id, {
      status: 'APROVADO',
      grade: 7.5,
    })
    expect(closed).toMatchObject({ status: 'APROVADO', grade: 7.5 })
    expect(
      await rejects(
        h.closeRecord.execute(ANA, open.id, { status: 'REPROVADO' }),
      ),
    ).toBe('RECORD_INVALID_TRANSITION')

    expect(
      (await h.listRecords.execute(ANA, h.enrollmentId)).map(
        (item) => item.subjectCode,
      ),
    ).toEqual(['LIV0001', 'ECO0001'])
    expect(await rejects(h.deleteRecord.execute(BIA, free.id))).toBe(
      'RECORD_NOT_FOUND',
    )
    await h.deleteRecord.execute(ANA, free.id)
    expect(await h.listRecords.execute(ANA, h.enrollmentId)).toHaveLength(1)
  })

  it('recusa disciplina fora do catálogo, sem semestre vigente e origem alheia', async () => {
    const h = await enrolled()
    const record = {
      subjectCode: 'ECO0001',
      term: '2025.1',
      status: 'APROVADO' as const,
    }
    expect(
      await rejects(
        h.addRecord.execute(ANA, h.enrollmentId, {
          ...record,
          subjectCode: 'XXX0001',
        }),
      ),
    ).toBe('SUBJECT_NOT_FOUND')

    const bia = await h.create.execute(BIA, {
      ...enrollmentInput,
      registrationNumber: '700001',
    })
    const biaRecord = await h.addRecord.execute(BIA, bia.id, record)
    expect(
      await rejects(
        h.addRecord.execute(ANA, h.enrollmentId, {
          ...record,
          status: 'APROVEITADA',
          sourceRecordId: biaRecord.id,
        }),
      ),
    ).toBe('RECORD_SOURCE_NOT_FOUND')
    expect(await rejects(h.addRecord.execute(ANA, bia.id, record))).toBe(
      'ENROLLMENT_NOT_FOUND',
    )

    h.store.term = null
    expect(
      await rejects(h.addRecord.execute(ANA, h.enrollmentId, record)),
    ).toBe('CURRENT_TERM_NOT_SET')
  })

  it('APROVEITADA liga ao registro de origem da matrícula anterior', async () => {
    const h = await enrolled()
    const origin = await h.addRecord.execute(ANA, h.enrollmentId, {
      subjectCode: 'ECO0001',
      term: '2024.1',
      status: 'APROVADO',
    })
    const cc = await h.create.execute(ANA, {
      ...enrollmentInput,
      courseSlug: 'cc',
      curriculumSlug: '2020-1',
    })
    const reused = await h.addRecord.execute(ANA, cc.id, {
      subjectCode: 'ECO0001',
      term: '2026.2',
      status: 'APROVEITADA',
      sourceRecordId: origin.id,
    })
    expect(reused.sourceRecordId).toBe(origin.id)
  })
})

describe('atividades', () => {
  async function enrolled() {
    const h = harness()
    const enrollment = await h.create.execute(ANA, enrollmentInput)
    h.store.categories.set('cat-1', {
      id: 'cat-1',
      curriculumId: 'ec-2006',
      kind: 'COMPLEMENTARY',
      name: 'Monitoria',
      maxHours: 60,
      position: 0,
    })
    h.store.files.set('f-1', file('f-1'))
    h.store.files.set('f-2', file('f-2'))
    return { ...h, enrollmentId: enrollment.id }
  }

  const activity = {
    kind: 'COMPLEMENTARY' as const,
    categoryId: 'cat-1',
    title: 'Monitoria de Cálculo',
    hours: 80,
    startedOn: '2025-03-01',
    certificateFileId: 'f-1',
  }

  it('liga o certificado, troca e solta ao excluir', async () => {
    const h = await enrolled()
    const created = await h.createActivity.execute(
      ANA,
      h.enrollmentId,
      activity,
    )
    expect(created).toMatchObject({ certificateFileId: 'f-1', endedOn: null })
    expect(h.store.files.get('f-1')?.status).toBe('ATTACHED')

    const updated = await h.updateActivity.execute(ANA, created.id, {
      ...activity,
      certificateFileId: 'f-2',
    })
    expect(updated.certificateFileId).toBe('f-2')
    expect(h.store.files.get('f-1')?.deletedAt).not.toBeNull()
    expect(h.store.files.get('f-2')?.status).toBe('ATTACHED')

    expect(await rejects(h.deleteActivity.execute(BIA, created.id))).toBe(
      'ACTIVITY_NOT_FOUND',
    )
    await h.deleteActivity.execute(ANA, created.id)
    expect(h.store.activities.size).toBe(0)
    expect(h.store.files.get('f-2')?.deletedAt).not.toBeNull()
  })

  it('recusa certificado alheio, de outra finalidade e categoria de outro tipo', async () => {
    const h = await enrolled()
    h.store.files.set('f-bia', file('f-bia', { ownerId: BIA }))
    h.store.files.set('f-avatar', file('f-avatar', { purpose: 'AVATAR' }))
    expect(
      await rejects(
        h.createActivity.execute(ANA, h.enrollmentId, {
          ...activity,
          certificateFileId: 'f-bia',
        }),
      ),
    ).toBe('FILE_NOT_FOUND')
    expect(
      await rejects(
        h.createActivity.execute(ANA, h.enrollmentId, {
          ...activity,
          certificateFileId: 'f-nada',
        }),
      ),
    ).toBe('FILE_NOT_FOUND')
    expect(
      await rejects(
        h.createActivity.execute(ANA, h.enrollmentId, {
          ...activity,
          certificateFileId: 'f-avatar',
        }),
      ),
    ).toBe('FILE_WRONG_PURPOSE')
    expect(
      await rejects(
        h.createActivity.execute(ANA, h.enrollmentId, {
          ...activity,
          kind: 'EXTENSION',
        }),
      ),
    ).toBe('ACTIVITY_CATEGORY_KIND_MISMATCH')
  })

  it('categorias só para moderador do curso ou admin', async () => {
    const h = await enrolled()
    const input = {
      kind: 'EXTENSION' as const,
      name: 'Projetos',
      maxHours: null,
      position: 1,
    }
    expect(await rejects(h.categories.create(actor(), 'ec-2006', input))).toBe(
      'ACCESS_DENIED',
    )
    const moderator = actor({ moderatedCourseIds: new Set(['c-eng']) })
    const created = await h.categories.create(moderator, 'ec-2006', input)
    const updated = await h.categories.update(moderator, created.id, {
      ...input,
      maxHours: 120,
    })
    expect(updated).toMatchObject({ name: 'Projetos', maxHours: 120 })
    expect(
      (await h.listCategories.execute(actor({ isAdmin: true }), 'ec-2006')).map(
        (item) => item.name,
      ),
    ).toEqual(['Monitoria', 'Projetos'])
    await h.categories.delete(moderator, created.id)
    expect(h.store.audit.map((entry) => entry.action)).toEqual([
      'CREATED',
      'UPDATED',
      'DELETED',
    ])
    expect(await rejects(h.categories.delete(moderator, created.id))).toBe(
      'ACTIVITY_CATEGORY_NOT_FOUND',
    )
    expect(await rejects(h.listCategories.execute(moderator, 'ec-nada'))).toBe(
      'CURRICULUM_NOT_FOUND',
    )
  })
})

describe('resumo da Minha área', () => {
  it('progresso, cursando, liberadas e o aviso de fechar situação', async () => {
    const h = harness()
    const { id } = await h.create.execute(ANA, enrollmentInput)
    await h.addRecord.execute(ANA, id, {
      subjectCode: 'ECO0001',
      term: '2025.1',
      status: 'APROVADO',
    })
    await h.addRecord.execute(ANA, id, {
      subjectCode: 'ECO0002',
      term: '2026.2',
      status: 'CURSANDO',
    })
    h.store.categories.set('cat-1', {
      id: 'cat-1',
      curriculumId: 'ec-2006',
      kind: 'COMPLEMENTARY',
      name: 'Monitoria',
      maxHours: 60,
      position: 0,
    })
    await h.createActivity.execute(ANA, id, {
      kind: 'COMPLEMENTARY',
      categoryId: 'cat-1',
      title: 'Monitoria',
      hours: 80,
      startedOn: '2025-03-01',
    })

    const summary = await h.summary.execute(ANA, id)
    expect(summary.currentTerm).toEqual({
      code: '2026.2',
      endsAt: '2026-12-11',
    })
    expect(summary.avgPeriodHours).toBe(360)
    // D40: obrigatórias sem o componente de complementares (292 - 100)
    expect(summary.progress.mandatory).toEqual({
      requiredHours: 192,
      completedHours: 64,
      met: false,
    })
    expect(summary.progress.complementary).toMatchObject({
      requiredHours: 100,
      completedHours: 60,
      componentCompleted: false,
    })
    expect(summary.progress.branches).toEqual([
      expect.objectContaining({
        branchId: 'b-redes',
        name: 'Redes',
        type: 'EMPHASIS',
        totalComponents: 1,
        met: false,
      }),
    ])
    expect(summary.inProgress.map((item) => item.subjectCode)).toEqual([
      'ECO0002',
    ])
    expect(summary.staleInProgress).toEqual([])
    // Faltam mais de 21 dias para 11/12
    expect(summary.closeReminderDue).toBe(false)
    // Redes não tem pré-requisito; o co-requisito Física está em CURSANDO
    expect(summary.available).toEqual([
      expect.objectContaining({ code: 'ECO0003', missingCorequisites: [] }),
    ])
    expect(summary.categories.map((item) => item.name)).toEqual(['Monitoria'])

    h.store.term = { code: '2027.1', endsAt: '2027-07-10' }
    const later = await h.summary.execute(ANA, id)
    expect(later.staleInProgress.map((item) => item.subjectCode)).toEqual([
      'ECO0002',
    ])
    expect(later.closeReminderDue).toBe(true)
    // Física em CURSANDO: Cálculo cumprida libera só o que não está em curso
    expect(later.available.map((item) => item.code)).toEqual(['ECO0003'])

    expect(await rejects(h.summary.execute(BIA, id))).toBe(
      'ENROLLMENT_NOT_FOUND',
    )
  })

  it('sem semestre vigente não há aviso nem CURSANDO antigo', async () => {
    const h = harness()
    const { id } = await h.create.execute(ANA, enrollmentInput)
    h.store.term = null
    const summary = await h.summary.execute(ANA, id)
    expect(summary).toMatchObject({
      currentTerm: null,
      closeReminderDue: false,
      staleInProgress: [],
    })
    expect(summary.available.map((item) => item.code)).toEqual([
      'ECO0001',
      'ECO0003',
    ])
  })
})
