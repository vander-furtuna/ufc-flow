import {
  Global,
  Inject,
  Module,
  type DynamicModule,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from './schema'

export type Database = NodePgDatabase<typeof schema>

export const DATABASE = Symbol('Database')
export const PG_POOL = Symbol('PgPool')

class PoolCloser implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown() {
    await this.pool.end()
  }
}

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(connectionString: string): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: PG_POOL,
          useFactory: () => new pg.Pool({ connectionString }),
        },
        {
          provide: DATABASE,
          inject: [PG_POOL],
          useFactory: (pool: pg.Pool): Database => drizzle(pool, { schema }),
        },
        PoolCloser,
      ],
      exports: [DATABASE, PG_POOL],
    }
  }
}
