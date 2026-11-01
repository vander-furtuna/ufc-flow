import { Inject, Injectable } from '@nestjs/common'
import type { ModeratorRequest } from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { IdentityErrors } from '../domain/errors'
import {
  approveModeratorRequest,
  rejectModeratorRequest,
} from '../domain/moderator-request'
import { IDENTITY_UOW, type IdentityUnitOfWork } from '../domain/ports'
import { toModeratorRequest } from './views'

export type ReviewDecision = 'APPROVED' | 'REJECTED'

// O admin aprova ou rejeita. Aprovar cria o moderador do curso na mesma
// transação; as duas decisões vão para audit_logs.
@Injectable()
export class ReviewModeratorRequestUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: Actor,
    requestId: string,
    decision: ReviewDecision,
    note: string | null,
  ): Promise<ModeratorRequest> {
    if (!AccessPolicy.canAdministerPlatform(actor) || actor.userId === null) {
      throw IdentityErrors.accessDenied()
    }
    const reviewerId = actor.userId

    return this.uow.run(async ({ moderation, audit }) => {
      const record = await moderation.findRequest(requestId)
      if (!record) throw IdentityErrors.moderatorRequestNotFound()
      const now = this.clock.now()
      const review = { reviewerId, now, note }
      const reviewed =
        decision === 'APPROVED'
          ? approveModeratorRequest(record, review)
          : rejectModeratorRequest(record, review)

      await moderation.updateRequest(reviewed)
      if (decision === 'APPROVED') {
        await moderation.insertModerator({
          id: this.ids.next(),
          userId: record.userId,
          courseId: record.courseId,
          requestId,
          grantedBy: reviewerId,
          grantedAt: now,
        })
      }
      await audit.record({
        id: this.ids.next(),
        actorId: reviewerId,
        module: 'identity',
        entity: 'moderator_request',
        entityId: requestId,
        action: `moderator_request.${decision.toLowerCase()}`,
        changes: { userId: record.userId, courseId: record.courseId, note },
        createdAt: now,
      })
      return toModeratorRequest({ ...record, ...reviewed })
    })
  }
}
