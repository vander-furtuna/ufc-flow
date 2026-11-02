import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { PurgeNotificationsUseCase } from '../../application/notifications.use-cases'

// Todo dia às 3h (Fortaleza): apaga as notificações lidas há mais de 90 dias
@Injectable()
export class NotificationsRetention {
  private readonly logger = new Logger(NotificationsRetention.name)

  constructor(
    @Inject(PurgeNotificationsUseCase)
    private readonly purge: PurgeNotificationsUseCase,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'America/Fortaleza' })
  async run(): Promise<void> {
    try {
      const removed = await this.purge.execute()
      if (removed > 0) {
        this.logger.log(`${removed} notificações antigas apagadas`)
      }
    } catch (error) {
      this.logger.error(
        `Falha ao apagar notificações antigas: ${(error as Error).message}`,
      )
    }
  }
}
