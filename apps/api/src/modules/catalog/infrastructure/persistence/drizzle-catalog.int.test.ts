import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  startDatabase,
  type TestDatabase,
} from '../../../../../test/support/database'
import { RandomIdGenerator } from '../../../../shared/infrastructure/random-id-generator'
import { SystemClock } from '../../../../shared/infrastructure/system-clock'
import {
  auditLogs,
  userRoles,
  users,
} from '../../../identity/infrastructure/persistence/identity.schema'
import {
  CreateCourseUseCase,
  DeleteCourseUseCase,
  GetPublicCurriculumUseCase,
  ListSigaaCoursesUseCase,
  RefreshSigaaCoursesUseCase,
} from '../../application/courses.use-cases'
import { CurriculumEditor } from '../../application/curriculum-editor'
import {
  CreateBranchUseCase,
  MarkCurrentCurriculumUseCase,
  PublishCurriculumUseCase,
  RemoveBranchUseCase,
  SetBranchSubjectsUseCase,
  UpdateCurriculumUseCase,
} from '../../application/curriculum-editing.use-cases'
import { ImportApplier } from '../../application/import-applier'
import {
  ApplyImportUseCase,
  CreateImportUseCase,
  GetImportUseCase,
  ListImportsUseCase,
  ResolveReviewPointUseCase,
} from '../../application/ingestion.use-cases'
import {
  SetSubjectEquivalencesUseCase,
  UpdateSubjectUseCase,
} from '../../application/subjects.use-cases'
import { actor, ENG_COMP, QUIMICA } from '../../application/testing/harness'
import { FixedSigaaSource } from '../../application/testing/in-memory-catalog'
import {
  anImport,
  anImportBranch,
  anImportSubject,
} from '../../domain/testing/imports'
import {
  curricula,
  curriculumSubjectRequirements,
  sigaaCourses,
  subjectEquivalenceCodes,
} from './catalog.schema'
import {
  catalogRepositories,
  DrizzleCatalogUnitOfWork,
} from './drizzle-catalog'

let database: TestDatabase
const adminId = randomUUID()
const admin = actor(adminId, { isAdmin: true })

function useCases() {
  const uow = new DrizzleCatalogUnitOfWork(database.db)
  const clock = new SystemClock()
  const ids = new RandomIdGenerator()
  const applier = new ImportApplier(clock, ids)
  const editor = new CurriculumEditor(uow, clock, ids)
  const getImport = new GetImportUseCase(uow)
  const updateSubject = new UpdateSubjectUseCase(uow, clock, ids)
  return {
    refresh: new RefreshSigaaCoursesUseCase(
      uow,
      clock,
      new FixedSigaaSource([ENG_COMP, QUIMICA]),
    ),
    listSigaa: new ListSigaaCoursesUseCase(uow),
    createCourse: new CreateCourseUseCase(uow, clock, ids, applier),
    deleteCourse: new DeleteCourseUseCase(uow),
    publicCurriculum: new GetPublicCurriculumUseCase(uow),
    createImport: new CreateImportUseCase(uow, clock, ids, applier),
    listImports: new ListImportsUseCase(uow),
    getImport,
    applyImport: new ApplyImportUseCase(uow, applier, getImport),
    resolve: new ResolveReviewPointUseCase(editor),
    updateCurriculum: new UpdateCurriculumUseCase(editor),
    createBranch: new CreateBranchUseCase(editor),
    removeBranch: new RemoveBranchUseCase(editor),
    setBranchSubjects: new SetBranchSubjectsUseCase(editor),
    publish: new PublishCurriculumUseCase(editor),
    markCurrent: new MarkCurrentCurriculumUseCase(editor),
    setEquivalences: new SetSubjectEquivalencesUseCase(
      uow,
      clock,
      updateSubject,
    ),
  }
}

const payload = anImport({
  branches: [
    anImportBranch({ key: 'slope', name: 'Computação' }),
    anImportBranch({
      key: 'enf',
      type: 'EMPHASIS',
      name: 'Sistemas',
      sigaaCode: '2006.2E1',
    }),
    anImportBranch({
      key: 'grupo',
      parentKey: 'enf',
      type: 'SPECIFIC_GROUP',
      name: 'Grupo A',
    }),
  ],
  subjects: [
    anImportSubject({
      code: 'ECO0001',
      name: 'ALGORITMOS',
      branches: [{ key: 'slope', nature: 'MANDATORY' }],
      equivalences: {
        kind: 'or',
        items: [
          { kind: 'subject', code: 'CEC0001' },
          { kind: 'subject', code: 'ECO0002' },
        ],
      },
    }),
    anImportSubject({
      code: 'ECO0002',
      name: 'ESTRUTURAS DE DADOS',
      semester: 2,
      prerequisites: { kind: 'subject', code: 'ECO0001' },
      corequisites: { kind: 'subject', code: 'CEC0058' },
      branches: [{ key: 'grupo', nature: 'OPTATIVE' }],
    }),
  ],
})

beforeAll(async () => {
  database = await startDatabase()
  await database.db.insert(users).values({
    id: adminId,
    name: 'Admin',
    email: 'admin@ufc.br',
    passwordHash: 'x',
    status: 'ACTIVE',
  })
  await database.db
    .insert(userRoles)
    .values({ userId: adminId, role: 'ADMIN', grantedAt: new Date() })
})

afterAll(async () => {
  await database?.stop()
})

describe('catálogo no PostgreSQL', () => {
  it('importa, publica, reimporta e resolve pontos de ponta a ponta', async () => {
    const h = useCases()
    expect(await h.refresh.execute(null)).toMatchObject({
      total: 2,
      added: 2,
      removed: 0,
    })
    const course = await h.createCourse.execute(admin, {
      sigaaId: ENG_COMP.sigaaId,
      slug: 'engenharia-de-computacao',
      name: 'Engenharia de Computação',
      icon: 'cpu',
      color: null,
    })
    expect(course.campus).toMatchObject({
      slug: 'sobral',
      name: 'Campus da UFC em Sobral',
    })

    const imported = await h.createImport.execute(admin, payload, 'UPLOAD')
    expect(imported).toMatchObject({ status: 'APPLIED', reviewPointCount: 1 })
    const id = imported.curriculum.id as string

    // Derivados gravados a partir da árvore
    const requirements = await database.db
      .select()
      .from(curriculumSubjectRequirements)
    expect(
      requirements
        .map(
          (row) =>
            `${row.kind}:${row.requiredCode}:${row.requiredSubjectId !== null}`,
        )
        .sort(),
    ).toEqual(['CO:CEC0058:false', 'PRE:ECO0001:true'])
    const equivalenceCodes = await database.db
      .select()
      .from(subjectEquivalenceCodes)
    expect(
      equivalenceCodes
        .map(
          (row) => `${row.equivalentCode}:${row.equivalentSubjectId !== null}`,
        )
        .sort(),
    ).toEqual(['CEC0001:false', 'ECO0002:true'])

    const managed = await h.resolve.execute(
      admin,
      imported.id,
      'unknown:ECO0002:CEC0058',
      'ACKNOWLEDGED',
    )
    expect(managed.reviewPoints[0]).toMatchObject({
      resolution: 'ACKNOWLEDGED',
    })
    expect(typeof managed.reviewPoints[0]?.resolvedAt).toBe('string')
    expect(managed.branches.map((branch) => branch.name)).toEqual([
      'Computação',
      'Sistemas',
      'Grupo A',
    ])

    await h.publish.execute(admin, id)
    await h.markCurrent.execute(admin, id)
    const publicView = await h.publicCurriculum.execute(
      'engenharia-de-computacao',
      '2006-2',
    )
    expect(publicView).toMatchObject({
      isCurrent: true,
      subjects: [
        { code: 'ECO0001', equivalences: { kind: 'or' } },
        {
          code: 'ECO0002',
          prerequisites: { kind: 'subject', code: 'ECO0001' },
        },
      ],
    })

    // Reimportação sem a ênfase e com uma disciplina nova
    const second = await h.createImport.execute(
      admin,
      anImport({
        branches: [payload.branches[0]!],
        subjects: [
          payload.subjects[0]!,
          { ...payload.subjects[1]!, branches: [] },
          anImportSubject({
            code: 'ECO0003',
            name: 'BANCO DE DADOS',
            semester: 3,
          }),
        ],
      }),
      'UPLOAD',
    )
    expect(second).toMatchObject({
      status: 'RECEIVED',
      pendingReason: 'DIFF_REVIEW',
    })
    const detail = await h.getImport.execute(admin, second.id)
    expect(detail.diff?.branches.removed).toEqual(['Sistemas', 'Grupo A'])
    await h.applyImport.execute(admin, second.id)
    const after = await h.publicCurriculum.execute(
      'engenharia-de-computacao',
      '2006-2',
    )
    expect(after.subjects.map((item) => item.code)).toEqual([
      'ECO0001',
      'ECO0002',
      'ECO0003',
    ])
    expect(after.branches.map((branch) => branch.name)).toEqual(['Computação'])

    const audit = await database.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.module, 'catalog'))
    expect(audit.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        'course.created',
        'curriculum.published',
        'curriculum.reimported',
      ]),
    )

    const page = await h.listImports.execute(admin, { limit: 1 })
    expect(page.items[0]?.id).toBe(second.id)
    const next = await h.listImports.execute(admin, {
      limit: 1,
      cursor: page.nextCursor as string,
    })
    expect(next.items[0]?.id).toBe(imported.id)
    const moderatorView = await h.listImports.execute(
      actor(randomUUID(), { moderatedCourseIds: new Set([course.id]) }),
      { limit: 20, status: 'APPLIED' },
    )
    expect(moderatorView.items).toHaveLength(2)

    await expect(
      h.deleteCourse.execute(admin, course.id),
    ).rejects.toMatchObject({
      code: 'COURSE_HAS_PUBLISHED_CURRICULA',
    })
  })

  it('edição grava vertentes e vínculos; slug repetido vira erro de domínio', async () => {
    const h = useCases()
    const course = await h.createCourse.execute(admin, {
      sigaaId: QUIMICA.sigaaId,
      slug: 'quimica',
      name: 'Química',
      icon: 'flask',
      color: null,
    })
    const first = await h.createImport.execute(
      admin,
      anImport({ course: { sigaaId: QUIMICA.sigaaId, recognition: 'MANUAL' } }),
      'UPLOAD',
    )
    await h.createImport.execute(
      admin,
      anImport({
        course: { sigaaId: QUIMICA.sigaaId, recognition: 'MANUAL' },
        curriculum: { code: '2025.1', effectiveTerm: '2025.1' },
      }),
      'UPLOAD',
    )
    const id = first.curriculum.id as string
    let managed = await h.createBranch.execute(admin, id, {
      parentId: null,
      type: 'SLOPE',
      name: 'Analítica',
      description: null,
      sigaaCode: null,
      color: null,
      mandatoryHours: null,
      minHours: null,
      maxHours: null,
      minComponents: null,
      maxComponents: null,
    })
    const branchId = managed.branches[0]!.id
    managed = await h.setBranchSubjects.execute(admin, id, branchId, {
      subjects: [{ code: 'ECO0001', nature: 'MANDATORY' }],
    })
    expect(managed.subjects[0]?.branches).toEqual([
      { branchId, nature: 'MANDATORY' },
    ])
    managed = await h.removeBranch.execute(admin, id, branchId)
    expect(managed.subjects[0]?.branches).toEqual([])

    await expect(
      h.updateCurriculum.execute(admin, id, { slug: '2025-1' }),
    ).rejects.toMatchObject({
      code: 'CURRICULUM_SLUG_TAKEN',
    })
    expect(course.slug).toBe('quimica')
  })

  it('sync do SIGAA marca removidos e equivalências regravam os códigos', async () => {
    const repos = catalogRepositories(database.db)
    const now = new Date('2026-12-01T00:00:00Z')
    const result = await repos.sigaaCourses.sync([ENG_COMP], now)
    expect(result).toEqual({ added: 0, removed: 1 })
    const [quimica] = await database.db
      .select()
      .from(sigaaCourses)
      .where(eq(sigaaCourses.sigaaId, QUIMICA.sigaaId))
    expect(quimica?.removedAt?.toISOString()).toBe(now.toISOString())
    const entries = await useCases().listSigaa.execute()
    expect(
      entries.find((item) => item.sigaaCourse.sigaaId === QUIMICA.sigaaId)
        ?.removed,
    ).toBe(true)

    await useCases().setEquivalences.execute(admin, 'ECO0001', null)
    const codes = await database.db.select().from(subjectEquivalenceCodes)
    expect(codes).toEqual([])
    expect(await repos.users.names([adminId])).toEqual(
      new Map([[adminId, 'Admin']]),
    )

    const current = await database.db
      .select()
      .from(curricula)
      .where(eq(curricula.isCurrent, true))
    expect(current).toHaveLength(1)
  })
})
