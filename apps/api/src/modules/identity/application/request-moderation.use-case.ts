import { Inject, Injectable } from '@nestjs/common'
import type {
  CreateModeratorRequestInput,
  ModeratorRequest,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { IdentityErrors } from '../domain/errors'
import { checkNewModeratorRequest } from '../domain/moderator-request'
import { IDENTITY_UOW, type IdentityUnitOfWork } from '../domain/ports'
import { toModeratorRequest } from './views'

@Injectable()
export class RequestModerationUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: Actor,
    input: CreateModeratorRequestInput,
  ): Promise<ModeratorRequest> {
    const userId = actor.userId
    if (userId === null || actor.isAdmin) throw IdentityErrors.accessDenied()

    return this.uow.run(async ({ courses, moderation }) => {
      if (!(await courses.findById(input.courseId))) {
        throw IdentityErrors.courseNotFound()
      }
      checkNewModeratorRequest({
        isModerator:
          !AccessPolicy.canRequestModeration(actor, input.courseId) ||
          (await moderation.isActiveModerator(userId, input.courseId)),
        hasPending: await moderation.hasPendingRequest(userId, input.courseId),
      })
      const id = this.ids.next()
      await moderation.insertRequest({
        id,
        userId,
        courseId: input.courseId,
        justification: input.justification.trim(),
        status: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: this.clock.now(),
      })
      return toModeratorRequest((await moderation.findRequest(id))!)
    })
  }
}
