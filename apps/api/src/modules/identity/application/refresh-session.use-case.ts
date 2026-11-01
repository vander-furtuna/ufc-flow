import { Inject, Injectable } from '@nestjs/common'
import type { AuthTokens, RefreshInput } from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { IdentityErrors } from '../domain/errors'
import {
  ACCESS_TOKENS,
  IDENTITY_UOW,
  OPAQUE_TOKENS,
  type AccessTokens,
  type IdentityUnitOfWork,
  type OpaqueTokens,
} from '../domain/ports'
import { rotateSession } from '../domain/session'
import { IDENTITY_SETTINGS, type IdentitySettings } from './identity-settings'
import type { SessionContext } from './session-issuer'
import { toTokens } from './views'

// Renovação com rotação: o token usado morre e outro nasce na mesma família.
// Um token já girado que volta indica cópia, e a família inteira é revogada.
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(ACCESS_TOKENS) private readonly accessTokens: AccessTokens,
    @Inject(OPAQUE_TOKENS) private readonly opaqueTokens: OpaqueTokens,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(IDENTITY_SETTINGS) private readonly settings: IdentitySettings,
  ) {}

  async execute(
    input: RefreshInput,
    context: SessionContext,
  ): Promise<AuthTokens> {
    const now = this.clock.now()
    const outcome = await this.uow.run(async ({ sessions, users }) => {
      const session = await sessions.findByTokenHash(
        this.opaqueTokens.hash(input.refreshToken),
      )
      if (!session) return { error: IdentityErrors.refreshTokenInvalid() }

      const refresh = this.opaqueTokens.generate()
      const rotation = rotateSession(session, {
        nextId: this.ids.next(),
        refreshTokenHash: refresh.hash,
        now,
        ttlDays: this.settings.refreshTokenTtlDays,
        ...context,
      })
      if (!rotation.ok) {
        // A revogação da família precisa ficar gravada mesmo com o erro
        if (rotation.error === 'REFRESH_TOKEN_REUSED') {
          await sessions.revokeFamily(session.familyId, now)
          return { error: IdentityErrors.refreshTokenReused() }
        }
        return { error: IdentityErrors.refreshTokenExpired() }
      }

      const user = await users.findById(session.userId)
      if (!user || user.status === 'SUSPENDED') {
        await sessions.revokeFamily(session.familyId, now)
        return { error: IdentityErrors.userSuspended() }
      }

      await sessions.update(rotation.value.previous)
      await sessions.insert(rotation.value.next)
      const access = await this.accessTokens.issue({ userId: user.id }, now)
      return {
        tokens: toTokens(access, {
          token: refresh.token,
          expiresAt: rotation.value.next.expiresAt,
        }),
      }
    })

    if ('error' in outcome) throw outcome.error
    return outcome.tokens
  }
}
