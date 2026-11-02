import { Global, Module, type DynamicModule } from '@nestjs/common'

import { ENV, type Env } from '../config/env'
import { CLOCK } from './domain/clock'
import { EVENT_PUBLISHER } from './domain/events'
import { ID_GENERATOR } from './domain/id-generator'
import { NestEventPublisher } from './infrastructure/nest-event-publisher'
import { RandomIdGenerator } from './infrastructure/random-id-generator'
import { SystemClock } from './infrastructure/system-clock'

// Configuração, relógio, gerador de ids e eventos para todos os módulos
@Global()
@Module({})
export class SharedModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: SharedModule,
      providers: [
        { provide: ENV, useValue: env },
        { provide: CLOCK, useClass: SystemClock },
        { provide: ID_GENERATOR, useClass: RandomIdGenerator },
        { provide: EVENT_PUBLISHER, useClass: NestEventPublisher },
      ],
      exports: [ENV, CLOCK, ID_GENERATOR, EVENT_PUBLISHER],
    }
  }
}
