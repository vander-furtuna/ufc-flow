import type { SigaaCourse } from '@ufc-flow/academic-core'

import type { Actor } from '../../../../shared/domain/access-policy'
import type { Course } from '../../domain/course'
import {
  ListCoursesUseCase,
  CreateCourseUseCase,
  DeleteCourseUseCase,
  GetPublicCourseUseCase,
  GetPublicCurriculumUseCase,
  ListManagedCoursesUseCase,
  ListSigaaCoursesUseCase,
  RefreshSigaaCoursesUseCase,
  UpdateCourseUseCase,
} from '../courses.use-cases'
import { CurriculumEditor } from '../curriculum-editor'
import {
  AddCurriculumSubjectUseCase,
  CreateBranchUseCase,
  CreateCurriculumUseCase,
  DeleteCurriculumUseCase,
  ExportCurriculumUseCase,
  GetManagedCurriculumUseCase,
  MarkCurrentCurriculumUseCase,
  PublishCurriculumUseCase,
  RemoveBranchUseCase,
  RemoveCurriculumSubjectUseCase,
  SetBranchSubjectsUseCase,
  UpdateBranchUseCase,
  UpdateCurriculumSubjectUseCase,
  UpdateCurriculumUseCase,
} from '../curriculum-editing.use-cases'
import { ImportApplier } from '../import-applier'
import {
  ApplyImportUseCase,
  CreateImportUseCase,
  DiscardImportUseCase,
  GetImportUseCase,
  ListImportsUseCase,
  ResolveReviewPointUseCase,
} from '../ingestion.use-cases'
import {
  SetSubjectEquivalencesUseCase,
  UpdateSubjectUseCase,
} from '../subjects.use-cases'
import {
  FixedSigaaSource,
  InMemoryCatalog,
  SequentialIds,
  SteppingClock,
} from './in-memory-catalog'

export const ENG_COMP: SigaaCourse = {
  sigaaId: '415113',
  name: 'ENGENHARIA DE COMPUTAÇÃO',
  city: 'SOBRAL',
  modality: 'IN_PERSON',
  unitAcronym: 'CUFCSOBRAL',
  unitName: 'CAMPUS DA UFC EM SOBRAL',
}

export const QUIMICA: SigaaCourse = {
  sigaaId: '657601',
  name: 'QUÍMICA',
  city: 'FORTALEZA',
  modality: 'IN_PERSON',
  unitAcronym: 'CC',
  unitName: 'CENTRO DE CIÊNCIAS',
}

export const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001'
export const MODERATOR_ID = 'a0000000-0000-4000-8000-000000000002'
export const OTHER_ID = 'a0000000-0000-4000-8000-000000000003'

export const actor = (
  userId: string,
  overrides: Partial<Actor> = {},
): Actor => ({
  userId,
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(),
  ...overrides,
})

export function harness() {
  const catalog = new InMemoryCatalog()
  const clock = new SteppingClock('2026-11-01T12:00:00.000Z')
  const ids = new SequentialIds()
  const source = new FixedSigaaSource([ENG_COMP, QUIMICA])
  const applier = new ImportApplier(clock, ids)
  const editor = new CurriculumEditor(catalog, clock, ids)
  const getImport = new GetImportUseCase(catalog)
  const updateSubject = new UpdateSubjectUseCase(catalog, clock, ids)

  catalog.admins.add(ADMIN_ID)
  catalog.userNames.set(ADMIN_ID, 'Admin')
  catalog.userNames.set(MODERATOR_ID, 'Ana Moderadora')

  const admin = actor(ADMIN_ID, { isAdmin: true })

  const useCases = {
    listCourses: new ListCoursesUseCase(catalog),
    publicCourse: new GetPublicCourseUseCase(catalog),
    publicCurriculum: new GetPublicCurriculumUseCase(catalog),
    listSigaa: new ListSigaaCoursesUseCase(catalog),
    refreshSigaa: new RefreshSigaaCoursesUseCase(catalog, clock, source),
    createCourse: new CreateCourseUseCase(catalog, clock, ids, applier),
    updateCourse: new UpdateCourseUseCase(catalog, clock),
    deleteCourse: new DeleteCourseUseCase(catalog),
    managedCourses: new ListManagedCoursesUseCase(catalog),
    getManaged: new GetManagedCurriculumUseCase(editor),
    createCurriculum: new CreateCurriculumUseCase(editor),
    updateCurriculum: new UpdateCurriculumUseCase(editor),
    addSubject: new AddCurriculumSubjectUseCase(editor),
    updateSubjectInCurriculum: new UpdateCurriculumSubjectUseCase(editor),
    removeSubject: new RemoveCurriculumSubjectUseCase(editor),
    createBranch: new CreateBranchUseCase(editor),
    updateBranch: new UpdateBranchUseCase(editor),
    removeBranch: new RemoveBranchUseCase(editor),
    setBranchSubjects: new SetBranchSubjectsUseCase(editor),
    publish: new PublishCurriculumUseCase(editor),
    markCurrent: new MarkCurrentCurriculumUseCase(editor),
    deleteCurriculum: new DeleteCurriculumUseCase(editor),
    exportCurriculum: new ExportCurriculumUseCase(editor),
    createImport: new CreateImportUseCase(catalog, clock, ids, applier),
    listImports: new ListImportsUseCase(catalog),
    getImport,
    applyImport: new ApplyImportUseCase(catalog, applier, getImport),
    discardImport: new DiscardImportUseCase(catalog),
    resolve: new ResolveReviewPointUseCase(editor),
    updateSubject,
    setEquivalences: new SetSubjectEquivalencesUseCase(
      catalog,
      clock,
      updateSubject,
    ),
  }

  // Catálogo do SIGAA lido e Eng. de Computação criada, com uma moderadora
  async function withCourse(): Promise<{ course: Course; moderator: Actor }> {
    await useCases.refreshSigaa.execute(null)
    const detail = await useCases.createCourse.execute(admin, {
      sigaaId: ENG_COMP.sigaaId,
      slug: 'engenharia-de-computacao',
      name: 'Engenharia de Computação',
      icon: 'cpu',
      color: null,
    })
    const course = catalog.courses.get(detail.id) as Course
    return {
      course,
      moderator: actor(MODERATOR_ID, {
        moderatedCourseIds: new Set([course.id]),
      }),
    }
  }

  return { catalog, clock, ids, source, admin, ...useCases, withCourse }
}
