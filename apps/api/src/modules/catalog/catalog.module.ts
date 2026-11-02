import { Module } from '@nestjs/common'

import { IdentityModule } from '../identity/identity.module'
import {
  CreateCourseUseCase,
  DeleteCourseUseCase,
  GetPublicCourseUseCase,
  GetPublicCurriculumUseCase,
  ListCoursesUseCase,
  ListManagedCoursesUseCase,
  ListSigaaCoursesUseCase,
  RefreshSigaaCoursesUseCase,
  UpdateCourseUseCase,
} from './application/courses.use-cases'
import { CurriculumEditor } from './application/curriculum-editor'
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
} from './application/curriculum-editing.use-cases'
import { ImportApplier } from './application/import-applier'
import {
  ApplyImportUseCase,
  CreateImportUseCase,
  DiscardImportUseCase,
  GetImportUseCase,
  ListImportsUseCase,
  ResolveReviewPointUseCase,
} from './application/ingestion.use-cases'
import {
  SetSubjectEquivalencesUseCase,
  UpdateSubjectUseCase,
} from './application/subjects.use-cases'
import { CATALOG_UOW, SIGAA_COURSE_SOURCE } from './domain/ports'
import { AdminCatalogController } from './infrastructure/http/admin-catalog.controller'
import { IngestionController } from './infrastructure/http/ingestion.controller'
import { ManageCurriculaController } from './infrastructure/http/manage-curricula.controller'
import { PublicCatalogController } from './infrastructure/http/public-catalog.controller'
import { DrizzleCatalogUnitOfWork } from './infrastructure/persistence/drizzle-catalog'
import { SigaaCourseSync } from './infrastructure/scheduling/sigaa-course-sync'
import { HttpSigaaCourseSource } from './infrastructure/sigaa/sigaa-course-list'

@Module({
  imports: [IdentityModule],
  controllers: [
    PublicCatalogController,
    AdminCatalogController,
    ManageCurriculaController,
    IngestionController,
  ],
  providers: [
    { provide: CATALOG_UOW, useClass: DrizzleCatalogUnitOfWork },
    { provide: SIGAA_COURSE_SOURCE, useClass: HttpSigaaCourseSource },
    ImportApplier,
    CurriculumEditor,
    SigaaCourseSync,
    ListCoursesUseCase,
    GetPublicCourseUseCase,
    GetPublicCurriculumUseCase,
    ListSigaaCoursesUseCase,
    RefreshSigaaCoursesUseCase,
    CreateCourseUseCase,
    UpdateCourseUseCase,
    DeleteCourseUseCase,
    ListManagedCoursesUseCase,
    GetManagedCurriculumUseCase,
    CreateCurriculumUseCase,
    UpdateCurriculumUseCase,
    DeleteCurriculumUseCase,
    AddCurriculumSubjectUseCase,
    UpdateCurriculumSubjectUseCase,
    RemoveCurriculumSubjectUseCase,
    CreateBranchUseCase,
    UpdateBranchUseCase,
    RemoveBranchUseCase,
    SetBranchSubjectsUseCase,
    PublishCurriculumUseCase,
    MarkCurrentCurriculumUseCase,
    ExportCurriculumUseCase,
    CreateImportUseCase,
    ListImportsUseCase,
    GetImportUseCase,
    ApplyImportUseCase,
    DiscardImportUseCase,
    ResolveReviewPointUseCase,
    UpdateSubjectUseCase,
    SetSubjectEquivalencesUseCase,
  ],
})
export class CatalogModule {}
