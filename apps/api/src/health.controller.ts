import { Controller, Get, HttpException, Inject } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Health } from '@ufc-flow/contracts'
import { sql } from 'drizzle-orm'

import { DATABASE, type Database } from './database/database.module'
import {
  ApiJson,
  ApiProblems,
  schemaRef,
} from './shared/infrastructure/http/openapi'

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  @ApiOperation({
    summary: 'Saúde da API',
    description: 'Confere a conexão com o banco (para o Coolify).',
  })
  @ApiJson(200, 'API e banco no ar', schemaRef('Health'))
  @ApiProblems(503)
  async check(): Promise<Health> {
    try {
      await this.db.execute(sql`select 1`)
    } catch {
      throw new HttpException('Banco indisponível', 503)
    }
    return { status: 'ok', database: 'ok' }
  }
}
