import { Inject, Injectable } from '@nestjs/common'
import type { Me } from '@ufc-flow/contracts'

import { IdentityErrors } from '../domain/errors'
import { IDENTITY_UOW, type IdentityUnitOfWork } from '../domain/ports'
import { toMe } from './views'

@Injectable()
export class GetMeUseCase {
  constructor(@Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork) {}

  async execute(userId: string): Promise<Me> {
    return this.uow.run(async ({ users, moderation }) => {
      const user = await users.findById(userId)
      if (!user) throw IdentityErrors.userNotFound()
      return toMe(
        user,
        await users.rolesOf(userId),
        await moderation.moderatedCourses(userId),
      )
    })
  }
}
