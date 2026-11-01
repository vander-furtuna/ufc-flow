import { Inject, Injectable } from '@nestjs/common'
import type { ResetPasswordInput } from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import { checkPassword } from '../domain/credentials'
import { IdentityErrors } from '../domain/errors'
import { consumePasswordResetToken } from '../domain/password-reset-token'
import {
  IDENTITY_UOW,
  OPAQUE_TOKENS,
  PASSWORD_HASHER,
  type IdentityUnitOfWork,
  type OpaqueTokens,
  type PasswordHasher,
} from '../domain/ports'

// Troca a senha pelo link do admin e encerra todas as sessões do usuário
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(OPAQUE_TOKENS) private readonly opaqueTokens: OpaqueTokens,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    checkPassword(input.password)
    const passwordHash = await this.hasher.hash(input.password)
    await this.uow.run(async ({ resetTokens, users, sessions }) => {
      const token = await resetTokens.findByTokenHash(
        this.opaqueTokens.hash(input.token),
      )
      if (!token) throw IdentityErrors.resetTokenInvalid()
      const now = this.clock.now()
      await resetTokens.update(consumePasswordResetToken(token, now))
      await users.updatePassword(token.userId, passwordHash, now)
      await sessions.revokeAllOfUser(token.userId, now)
    })
  }
}
