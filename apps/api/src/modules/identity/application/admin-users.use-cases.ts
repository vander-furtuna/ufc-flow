import { Inject, Injectable } from '@nestjs/common'
import type {
  AdminUserListQuery,
  AdminUserPage,
  UserStatus,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import { decodeCursor, pageOf } from '../../../shared/domain/cursor'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { assertCanSuspend } from '../domain/account'
import { IdentityErrors } from '../domain/errors'
import { IDENTITY_UOW, type IdentityUnitOfWork } from '../domain/ports'
import { toAdminUser } from './views'

const assertAdmin = (actor: Actor) => {
  if (!AccessPolicy.canAdministerPlatform(actor)) {
    throw IdentityErrors.accessDenied()
  }
}

// Admin › Usuários: busca por nome ou e-mail, das contas mais novas
@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork) {}

  async execute(
    actor: Actor,
    query: AdminUserListQuery,
  ): Promise<AdminUserPage> {
    assertAdmin(actor)
    const before = decodeCursor(query.cursor)
    return this.uow.run(async ({ users }) => {
      const rows = await users.search({
        text: query.q ? query.q : null,
        status: query.status ?? null,
        before,
        limit: query.limit,
      })
      return pageOf(rows, query.limit, toAdminUser)
    })
  }
}

// Suspender encerra as sessões; a conta não entra mais até ser reativada.
// Mitigação da identidade não verificada (Lacunas e riscos).
@Injectable()
export class SetUserStatusUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  suspend(actor: Actor, userId: string) {
    return this.change(actor, userId, 'SUSPENDED')
  }

  reactivate(actor: Actor, userId: string) {
    return this.change(actor, userId, 'ACTIVE')
  }

  private async change(actor: Actor, userId: string, status: UserStatus) {
    assertAdmin(actor)
    await this.uow.run(async ({ users, sessions, audit }) => {
      const user = await users.findById(userId)
      if (!user) throw IdentityErrors.userNotFound()
      if (status === 'SUSPENDED') {
        assertCanSuspend(actor.userId!, userId, await users.rolesOf(userId))
      }
      if (user.status === status) return
      const now = this.clock.now()
      await users.setStatus(userId, status, now)
      if (status === 'SUSPENDED') await sessions.revokeAllOfUser(userId, now)
      await audit.record({
        id: this.ids.next(),
        actorId: actor.userId,
        module: 'identity',
        entity: 'user',
        entityId: userId,
        action: status === 'SUSPENDED' ? 'user.suspended' : 'user.reactivated',
        changes: { from: user.status, to: status },
        createdAt: now,
      })
    })
  }
}
