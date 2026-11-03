import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import type { DomainEvent } from '../../../../shared/domain/events'
import { EventNotifier } from '../../application/notifications.use-cases'

// Recebe os eventos de domínio depois do commit. Falha aqui só vira log: a
// ação que gerou o evento já terminou (modelagem, Notificações).
@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name)

  constructor(
    @Inject(EventNotifier) private readonly notifier: EventNotifier,
  ) {}

  @OnEvent('ModeratorRequestCreated', { async: true })
  @OnEvent('ModeratorRequestReviewed', { async: true })
  @OnEvent('CurriculumImportPending', { async: true })
  @OnEvent('ScrapeFailed', { async: true })
  @OnEvent('SectionsChanged', { async: true })
  @OnEvent('MessageReplied', { async: true })
  @OnEvent('MessageLiked', { async: true })
  async handle(event: DomainEvent): Promise<void> {
    try {
      await this.notifier.handle(event)
    } catch (error) {
      this.logger.error(
        `Notificações de ${event.type} perdidas: ${(error as Error).message}`,
      )
    }
  }
}
