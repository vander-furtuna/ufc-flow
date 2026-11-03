import { Module } from '@nestjs/common'

import { ENV, type Env } from '../../config/env'
import { IdentityModule } from '../identity/identity.module'
import {
  ReadForumUseCase,
  SearchSubjectsUseCase,
  WriteForumUseCase,
} from './application/forum.use-cases'
import {
  ModerateMessageUseCase,
  ModerationQueueUseCase,
  ReportMessageUseCase,
  RestrictUserUseCase,
} from './application/moderation.use-cases'
import type { RateLimits } from './domain/message'
import { FORUM_RATE_LIMITS, FORUM_UOW } from './domain/ports'
import {
  ForumController,
  SubjectSearchController,
} from './infrastructure/http/forum.controller'
import { ModerationController } from './infrastructure/http/moderation.controller'
import { DrizzleForumUnitOfWork } from './infrastructure/persistence/drizzle-forum'

@Module({
  imports: [IdentityModule],
  controllers: [ForumController, SubjectSearchController, ModerationController],
  providers: [
    { provide: FORUM_UOW, useClass: DrizzleForumUnitOfWork },
    {
      provide: FORUM_RATE_LIMITS,
      inject: [ENV],
      useFactory: (env: Env): RateLimits => ({
        burst: env.FORUM_RATE_BURST,
        burstSeconds: env.FORUM_RATE_BURST_SECONDS,
        hourly: env.FORUM_RATE_HOURLY,
      }),
    },
    ReadForumUseCase,
    WriteForumUseCase,
    SearchSubjectsUseCase,
    ReportMessageUseCase,
    ModerateMessageUseCase,
    RestrictUserUseCase,
    ModerationQueueUseCase,
  ],
})
export class ForumModule {}
