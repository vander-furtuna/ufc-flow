import { Module, type DynamicModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'

import type { Env } from './config/env'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { CatalogModule } from './modules/catalog/catalog.module'
import { IdentityModule } from './modules/identity/identity.module'
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
        IdentityModule,
        CatalogModule,
      ],
      controllers: [HealthController],
      providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
    }
  }
}
