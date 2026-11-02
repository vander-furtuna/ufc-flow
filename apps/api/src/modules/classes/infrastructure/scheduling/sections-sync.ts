import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { ENV, type Env } from '../../../../config/env'
import { CollectAllSectionsUseCase } from '../../application/classes.use-cases'

// Coleta as turmas de todos os cursos ativos a cada 6 horas (horário de
// Fortaleza). Uma rodada não começa enquanto a anterior não terminou.
@Injectable()
export class SectionsSync {
  private readonly logger = new Logger(SectionsSync.name)
  private running = false

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(CollectAllSectionsUseCase)
    private readonly collectAll: CollectAllSectionsUseCase,
  ) {}

  @Cron('0 */6 * * *', { timeZone: 'America/Fortaleza' })
  async run(): Promise<void> {
    if (!this.env.CLASSES_SYNC_ENABLED || this.running) return
    this.running = true
    try {
      const runs = await this.collectAll.execute()
      const failed = runs.filter((run) => run.status === 'FAILED')
      this.logger.log(
        `Turmas do SIGAA: ${runs.length} coletas, ${failed.length} com falha`,
      )
      for (const run of failed) {
        this.logger.warn(`${run.term} ${run.courseSlug}: ${run.error}`)
      }
    } catch (error) {
      this.logger.error(
        `Falha na coleta de turmas: ${(error as Error).message}`,
      )
    } finally {
      this.running = false
    }
  }
}
