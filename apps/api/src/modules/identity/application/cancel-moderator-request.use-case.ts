import { Inject, Injectable } from '@nestjs/common'
import type { ModeratorRequest } from '@ufc-flow/contracts'

import type { Actor } from '../../../shared/domain/access-policy'
import { IdentityErrors } from '../domain/errors'
import { cancelModeratorRequest } from '../domain/moderator-request'
import { IDENTITY_UOW, type IdentityUnitOfWork } from '../domain/ports'
import { toModeratorRequest } from './views'

@Injectable()
export class CancelModeratorRequestUseCase {
  constructor(@Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork) {}

  async execute(actor: Actor, requestId: string): Promise<ModeratorRequest> {
    if (actor.userId === null) throw IdentityErrors.accessDenied()
    const userId = actor.userId
    return this.uow.run(async ({ moderation }) => {
      const record = await moderation.findRequest(requestId)
      if (!record) throw IdentityErrors.moderatorRequestNotFound()
      const canceled = cancelModeratorRequest(record, userId)
      await moderation.updateRequest(canceled)
      return toModeratorRequest({ ...record, ...canceled })
    })
  }
}
