import { Inject, Injectable } from '@nestjs/common'
import type { AuthSession, SignUpInput } from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { checkPassword, normalizeEmail } from '../domain/credentials'
import { IdentityErrors } from '../domain/errors'
import {
  IDENTITY_UOW,
  PASSWORD_HASHER,
  type IdentityUnitOfWork,
  type PasswordHasher,
} from '../domain/ports'
import { IDENTITY_SETTINGS, type IdentitySettings } from './identity-settings'
import { SessionIssuer, type SessionContext } from './session-issuer'
import { toMe } from './views'

// Cadastro com aceite de Termos e Privacidade (LGPD); a conta já sai logada
@Injectable()
export class SignUpUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(SessionIssuer) private readonly issuer: SessionIssuer,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(IDENTITY_SETTINGS) private readonly settings: IdentitySettings,
  ) {}

  async execute(
    input: SignUpInput,
    context: SessionContext,
  ): Promise<AuthSession> {
    checkPassword(input.password)
    const email = normalizeEmail(input.email)
    const passwordHash = await this.hasher.hash(input.password)

    return this.uow.run(async ({ users, sessions }) => {
      if (await users.findByEmail(email)) throw IdentityErrors.emailTaken()
      const now = this.clock.now()
      const user = {
        id: this.ids.next(),
        name: input.name.trim(),
        email,
        passwordHash,
        status: 'ACTIVE' as const,
        createdAt: now,
        updatedAt: now,
      }
      await users.insert(user)
      await users.insertConsents([
        {
          id: this.ids.next(),
          userId: user.id,
          document: 'TERMS',
          version: this.settings.consentVersions.terms,
          acceptedAt: now,
        },
        {
          id: this.ids.next(),
          userId: user.id,
          document: 'PRIVACY',
          version: this.settings.consentVersions.privacy,
          acceptedAt: now,
        },
      ])
      const tokens = await this.issuer.start(sessions, user.id, context)
      return { user: toMe(user, [], [], []), tokens }
    })
  }
}
