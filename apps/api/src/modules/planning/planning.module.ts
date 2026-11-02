import { Module } from '@nestjs/common'

import { IdentityModule } from '../identity/identity.module'
import {
  DeleteScheduleUseCase,
  ImportSchedulesUseCase,
  ListSchedulesUseCase,
  SaveScheduleUseCase,
} from './application/schedules.use-cases'
import { PLANNING_UOW } from './domain/ports'
import { SchedulesController } from './infrastructure/http/schedules.controller'
import { DrizzlePlanningUnitOfWork } from './infrastructure/persistence/drizzle-planning'

@Module({
  imports: [IdentityModule],
  controllers: [SchedulesController],
  providers: [
    { provide: PLANNING_UOW, useClass: DrizzlePlanningUnitOfWork },
    ListSchedulesUseCase,
    SaveScheduleUseCase,
    DeleteScheduleUseCase,
    ImportSchedulesUseCase,
  ],
})
export class PlanningModule {}
