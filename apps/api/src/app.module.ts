import { Module, type DynamicModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'

import type { Env } from './config/env'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { AcademicRecordModule } from './modules/academic-record/academic-record.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { ClassesModule } from './modules/classes/classes.module'
import { FilesModule } from './modules/files/files.module'
import { ForumModule } from './modules/forum/forum.module'
import { HubModule } from './modules/hub/hub.module'
import { LinkPageModule } from './modules/link-page/link-page.module'
import { IdentityModule } from './modules/identity/identity.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { PlanningModule } from './modules/planning/planning.module'
import { AppThrottlerGuard } from './shared/infrastructure/http/app-throttler.guard'
import { SharedModule } from './shared/shared.module'

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        SharedModule.forRoot(env),
        DatabaseModule.forRoot(env.DATABASE_URL),
        // Limite geral por IP; as rotas de login têm limites próprios
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
        ScheduleModule.forRoot(),
        // Eventos de domínio, tratados depois do commit (notificações)
        EventEmitterModule.forRoot(),
        IdentityModule,
        CatalogModule,
        ClassesModule,
        PlanningModule,
        NotificationsModule,
        FilesModule,
        AcademicRecordModule,
        HubModule,
        LinkPageModule,
        ForumModule,
      ],
      controllers: [HealthController],
      providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
    }
  }
}
