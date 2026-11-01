import { Global, Module, type DynamicModule } from '@nestjs/common'

import { ENV, type Env } from '../config/env'
import { CLOCK } from './domain/clock'
import { ID_GENERATOR } from './domain/id-generator'
import { RandomIdGenerator } from './infrastructure/random-id-generator'
import { SystemClock } from './infrastructure/system-clock'

// Configuração, relógio e gerador de ids para todos os módulos
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
      ],
      exports: [ENV, CLOCK, ID_GENERATOR],
    }
  }
}
