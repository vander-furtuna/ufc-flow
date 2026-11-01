import { Inject, Injectable } from '@nestjs/common'
import type { ModeratorRequest } from '@ufc-flow/contracts'

import type { Actor } from '../../../shared/domain/access-policy'
import { IdentityErrors } from '../domain/errors'
import { IDENTITY_UOW, type IdentityUnitOfWork } from '../domain/ports'
import { toModeratorRequest } from './views'

@Injectable()
export class ListMyModeratorRequestsUseCase {
  constructor(@Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork) {}

  async execute(actor: Actor): Promise<ModeratorRequest[]> {
    if (actor.userId === null) throw IdentityErrors.accessDenied()
    const userId = actor.userId
    return this.uow.run(async ({ moderation }) =>
      (await moderation.listRequestsOfUser(userId)).map(toModeratorRequest),
    )
  }
}
