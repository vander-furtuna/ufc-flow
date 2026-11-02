// Eventos de domínio publicados depois do commit. Os handlers (notificações,
// por enquanto) rodam fora da transação e nunca afetam a ação principal: sem
// outbox, um evento pode se perder se a API cair nesse meio (modelagem,
// Notificações).
export type DomainEvent =
  | {
      type: 'ModeratorRequestCreated'
      requestId: string
      userId: string
      courseId: string
      occurredAt: Date
    }
  | {
      type: 'ModeratorRequestReviewed'
      requestId: string
      userId: string
      courseId: string
      reviewerId: string
      decision: 'APPROVED' | 'REJECTED'
      note: string | null
      occurredAt: Date
    }
  | {
      type: 'CurriculumImportPending'
      importId: string
      sigaaId: string
      courseName: string
      importedBy: string
      occurredAt: Date
    }
  | {
      type: 'ScrapeFailed'
      runId: string
      courseId: string
      termId: string
      error: string
      // Quem disparou a coleta manual (null na agendada)
      actorId: string | null
      occurredAt: Date
    }
  | {
      type: 'SectionsChanged'
      termId: string
      // Turmas que já existiam e mudaram de horário ou docentes
      changedSectionIds: string[]
      // Turmas que nenhum curso oferta mais
      removedSectionIds: string[]
      occurredAt: Date
    }

export type DomainEventType = DomainEvent['type']

export interface EventPublisher {
  publish(events: readonly DomainEvent[]): void
}

export const EVENT_PUBLISHER = Symbol('EventPublisher')

// Para testes: guarda o que foi publicado
export class RecordingEventPublisher implements EventPublisher {
  readonly events: DomainEvent[] = []

  publish(events: readonly DomainEvent[]) {
    this.events.push(...events)
  }
}
