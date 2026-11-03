import { Module } from '@nestjs/common'

import { IdentityModule } from '../identity/identity.module'
import {
  GetHubDeadlinesUseCase,
  GetHubFeedUseCase,
  GetPostUseCase,
  HubReadsUseCase,
  SavePostUseCase,
} from './application/hub.use-cases'
import { HUB_UOW } from './domain/ports'
import { HubController } from './infrastructure/http/hub.controller'
import { DrizzleHubUnitOfWork } from './infrastructure/persistence/drizzle-hub'

@Module({
  imports: [IdentityModule],
  controllers: [HubController],
  providers: [
    { provide: HUB_UOW, useClass: DrizzleHubUnitOfWork },
    GetHubFeedUseCase,
    GetPostUseCase,
    GetHubDeadlinesUseCase,
    SavePostUseCase,
    HubReadsUseCase,
  ],
})
export class HubModule {}
