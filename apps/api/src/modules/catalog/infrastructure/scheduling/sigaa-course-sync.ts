import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { ENV, type Env } from '../../../../config/env'
import { RefreshSigaaCoursesUseCase } from '../../application/courses.use-cases'

// Lê a lista pública de cursos do SIGAA toda segunda às 4h (horário de
// Fortaleza). Falha só vira log: o catálogo anterior continua valendo.
@Injectable()
export class SigaaCourseSync {
  private readonly logger = new Logger(SigaaCourseSync.name)

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(RefreshSigaaCoursesUseCase)
    private readonly refresh: RefreshSigaaCoursesUseCase,
  ) {}

  @Cron('0 4 * * 1', { timeZone: 'America/Fortaleza' })
  async run(): Promise<void> {
    if (!this.env.SIGAA_SYNC_ENABLED) return
    try {
      const result = await this.refresh.execute(null)
      this.logger.log(
        `Catálogo do SIGAA: ${result.total} cursos, ${result.added} novos, ${result.removed} removidos`,
      )
    } catch (error) {
      this.logger.error(
        `Falha ao ler a lista de cursos do SIGAA: ${(error as Error).message}`,
      )
    }
  }
}
