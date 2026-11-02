import { Module } from '@nestjs/common'

import { IdentityModule } from '../identity/identity.module'
import {
  CreateActivityUseCase,
  DeleteActivityUseCase,
  ListActivitiesUseCase,
  ListActivityCategoriesUseCase,
  SaveActivityCategoryUseCase,
  UpdateActivityUseCase,
} from './application/activities.use-cases'
import {
  ChangeCurriculumUseCase,
  CreateEnrollmentUseCase,
  ListEnrollmentsUseCase,
} from './application/enrollments.use-cases'
import {
  AddRecordUseCase,
  CloseRecordUseCase,
  DeleteRecordUseCase,
  ListRecordsUseCase,
} from './application/records.use-cases'
import { GetAcademicSummaryUseCase } from './application/summary.use-case'
import { ACADEMIC_RECORD_UOW } from './domain/ports'
import { AcademicRecordController } from './infrastructure/http/academic-record.controller'
import { ActivityCategoriesController } from './infrastructure/http/activity-categories.controller'
import { DrizzleAcademicRecordUnitOfWork } from './infrastructure/persistence/drizzle-academic-record'

@Module({
  imports: [IdentityModule],
  controllers: [AcademicRecordController, ActivityCategoriesController],
  providers: [
    { provide: ACADEMIC_RECORD_UOW, useClass: DrizzleAcademicRecordUnitOfWork },
    ListEnrollmentsUseCase,
    CreateEnrollmentUseCase,
    ChangeCurriculumUseCase,
    GetAcademicSummaryUseCase,
    ListRecordsUseCase,
    AddRecordUseCase,
    CloseRecordUseCase,
    DeleteRecordUseCase,
    ListActivitiesUseCase,
    CreateActivityUseCase,
    UpdateActivityUseCase,
    DeleteActivityUseCase,
    ListActivityCategoriesUseCase,
    SaveActivityCategoryUseCase,
  ],
})
export class AcademicRecordModule {}
