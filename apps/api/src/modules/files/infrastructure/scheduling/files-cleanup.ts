import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron } from '@nestjs/schedule'

import { CleanupFilesUseCase } from '../../application/files.use-cases'

// Todo dia às 4h30 (Fortaleza): pendentes com mais de 24 h, arquivos soltos
// pelas entidades e pessoais de contas excluídas saem do disco
@Injectable()
export class FilesCleanup {
  private readonly logger = new Logger(FilesCleanup.name)

  constructor(
    @Inject(CleanupFilesUseCase)
    private readonly cleanup: CleanupFilesUseCase,
  ) {}

  @Cron('30 4 * * *', { timeZone: 'America/Fortaleza' })
  // Conta excluída: os arquivos pessoais saem do disco na hora, sem esperar
  // a madrugada. Falhar aqui não desfaz a exclusão; o job diário repete.
  @OnEvent('AccountDeleted', { async: true })
  async run(): Promise<void> {
    try {
      const removed = await this.cleanup.execute()
      if (removed > 0) {
        this.logger.log(`${removed} arquivos apagados`)
      }
    } catch (error) {
      this.logger.error(
        `Falha na limpeza de arquivos: ${(error as Error).message}`,
      )
    }
  }
}
