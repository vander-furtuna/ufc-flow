import { Module } from '@nestjs/common'

import { ENV, type Env } from '../../config/env'
import { IdentityModule } from '../identity/identity.module'
import {
  EvaluationCriteriaUseCase,
  SubjectEvaluationsUseCase,
} from './application/evaluation.use-cases'
import {
  EVALUATION_SETTINGS,
  EVALUATION_UOW,
  type EvaluationSettings,
} from './domain/ports'
import { EvaluationController } from './infrastructure/http/evaluation.controller'
import { DrizzleEvaluationUnitOfWork } from './infrastructure/persistence/drizzle-evaluation'

@Module({
  imports: [IdentityModule],
  controllers: [EvaluationController],
  providers: [
    { provide: EVALUATION_UOW, useClass: DrizzleEvaluationUnitOfWork },
    {
      provide: EVALUATION_SETTINGS,
      inject: [ENV],
      useFactory: (env: Env): EvaluationSettings => ({
        requireInstitutionalEmail: env.EVALUATION_REQUIRE_INSTITUTIONAL_EMAIL,
      }),
    },
    SubjectEvaluationsUseCase,
    EvaluationCriteriaUseCase,
  ],
})
export class EvaluationModule {}
