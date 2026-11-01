import { Inject, Injectable } from '@nestjs/common'
import type { PasswordResetLink } from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { IdentityErrors } from '../domain/errors'
import { issuePasswordResetToken } from '../domain/password-reset-token'
import {
  IDENTITY_UOW,
  OPAQUE_TOKENS,
  type IdentityUnitOfWork,
  type OpaqueTokens,
} from '../domain/ports'
import { IDENTITY_SETTINGS, type IdentitySettings } from './identity-settings'

// Sem SMTP, o admin gera um link de uso único (24 h) e o entrega por fora
@Injectable()
export class CreatePasswordResetLinkUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(OPAQUE_TOKENS) private readonly opaqueTokens: OpaqueTokens,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(IDENTITY_SETTINGS) private readonly settings: IdentitySettings,
  ) {}

  async execute(actor: Actor, userId: string): Promise<PasswordResetLink> {
    if (!AccessPolicy.canAdministerPlatform(actor)) {
      throw IdentityErrors.accessDenied()
    }
    return this.uow.run(async ({ users, resetTokens, audit }) => {
      if (!(await users.findById(userId))) throw IdentityErrors.userNotFound()
      const now = this.clock.now()
      await resetTokens.expireOpenOfUser(userId, now)
      const secret = this.opaqueTokens.generate()
      const token = issuePasswordResetToken({
        id: this.ids.next(),
        userId,
        tokenHash: secret.hash,
        createdBy: actor.userId!,
        now,
      })
      await resetTokens.insert(token)
      await audit.record({
        id: this.ids.next(),
        actorId: actor.userId,
        module: 'identity',
        entity: 'user',
        entityId: userId,
        action: 'password_reset_link.created',
        changes: { expiresAt: token.expiresAt.toISOString() },
        createdAt: now,
      })
      const url = new URL('/redefinir-senha', this.settings.webUrl)
      url.searchParams.set('token', secret.token)
      return { url: url.toString(), expiresAt: token.expiresAt.toISOString() }
    })
  }
}
