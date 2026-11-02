import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import type { DomainEvent, EventPublisher } from '../domain/events'

// Barramento em memória (@nestjs/event-emitter): cada evento vai pelo nome do
// tipo, e os handlers com @OnEvent rodam assíncronos
@Injectable()
export class NestEventPublisher implements EventPublisher {
  constructor(@Inject(EventEmitter2) private readonly emitter: EventEmitter2) {}

  publish(events: readonly DomainEvent[]) {
    for (const event of events) this.emitter.emit(event.type, event)
  }
}
