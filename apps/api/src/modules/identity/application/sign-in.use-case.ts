import { Inject, Injectable } from '@nestjs/common'
import type { AuthSession, SignInInput } from '@ufc-flow/contracts'

import { normalizeEmail } from '../domain/credentials'
import { IdentityErrors } from '../domain/errors'
import {
  IDENTITY_UOW,
  PASSWORD_HASHER,
  type IdentityUnitOfWork,
  type PasswordHasher,
} from '../domain/ports'
import { SessionIssuer, type SessionContext } from './session-issuer'
import { toMe } from './views'

// Login com e-mail e senha. O limite de tentativas fica na rota (throttler).
@Injectable()
export class SignInUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(SessionIssuer) private readonly issuer: SessionIssuer,
  ) {}

  async execute(
    input: SignInInput,
    context: SessionContext,
  ): Promise<AuthSession> {
    return this.uow.run(async ({ users, sessions, moderation }) => {
      const user = await users.findByEmail(normalizeEmail(input.email))
      if (!user) {
        // Mesmo custo de quando o e-mail existe, para não revelar contas
        await this.hasher.hash(input.password)
        throw IdentityErrors.invalidCredentials()
      }
      if (!(await this.hasher.verify(user.passwordHash, input.password))) {
        throw IdentityErrors.invalidCredentials()
      }
      if (user.status === 'SUSPENDED') throw IdentityErrors.userSuspended()

      const tokens = await this.issuer.start(sessions, user.id, context)
      const me = toMe(
        user,
        await users.rolesOf(user.id),
        await moderation.moderatedCourses(user.id),
      )
      return { user: me, tokens }
    })
  }
}
