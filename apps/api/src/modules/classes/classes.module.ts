import { setTimeout } from 'node:timers/promises'

import { Module } from '@nestjs/common'

import { ENV, type Env } from '../../config/env'
import { IdentityModule } from '../identity/identity.module'
import {
  CollectAllSectionsUseCase,
  CollectSectionsUseCase,
  CreateTermUseCase,
  DeleteTermUseCase,
  GetCurrentTermUseCase,
  ListCourseSectionsUseCase,
  ListTermsUseCase,
  MarkCurrentTermUseCase,
  UpdateTermUseCase,
} from './application/classes.use-cases'
import {
  CLASSES_UOW,
  COLLECTION_SETTINGS,
  PAUSE,
  SIGAA_SECTION_SOURCE,
  type CollectionSettings,
  type Pause,
} from './domain/ports'
import { AdminTermsController } from './infrastructure/http/admin-terms.controller'
import { ClassesController } from './infrastructure/http/classes.controller'
import { DrizzleClassesUnitOfWork } from './infrastructure/persistence/drizzle-classes'
import { SectionsSync } from './infrastructure/scheduling/sections-sync'
import { HttpSigaaSectionSource } from './infrastructure/sigaa/sigaa-sections'

@Module({
  imports: [IdentityModule],
  controllers: [ClassesController, AdminTermsController],
  providers: [
    { provide: CLASSES_UOW, useClass: DrizzleClassesUnitOfWork },
    { provide: SIGAA_SECTION_SOURCE, useClass: HttpSigaaSectionSource },
    {
      provide: PAUSE,
      useValue: (async (ms) => {
        await setTimeout(ms)
      }) satisfies Pause,
    },
    {
      provide: COLLECTION_SETTINGS,
      inject: [ENV],
      useFactory: (env: Env): CollectionSettings => ({
        pauseMs: env.CLASSES_SYNC_PAUSE_MS,
      }),
    },
    SectionsSync,
    ListTermsUseCase,
    GetCurrentTermUseCase,
    CreateTermUseCase,
    UpdateTermUseCase,
    MarkCurrentTermUseCase,
    DeleteTermUseCase,
    ListCourseSectionsUseCase,
    CollectSectionsUseCase,
    CollectAllSectionsUseCase,
  ],
})
export class ClassesModule {}
