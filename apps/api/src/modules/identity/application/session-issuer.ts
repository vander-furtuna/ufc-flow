import { Inject, Injectable } from '@nestjs/common'
import type { AuthTokens } from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import {
  ACCESS_TOKENS,
  OPAQUE_TOKENS,
  type AccessTokens,
  type OpaqueTokens,
  type SessionRepository,
} from '../domain/ports'
import { startSession } from '../domain/session'
import { IDENTITY_SETTINGS, type IdentitySettings } from './identity-settings'
import { toTokens } from './views'

export type SessionContext = { userAgent: string | null; ip: string | null }

// Abre uma sessão nova (família nova) e emite os dois tokens
@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(ACCESS_TOKENS) private readonly accessTokens: AccessTokens,
    @Inject(OPAQUE_TOKENS) private readonly opaqueTokens: OpaqueTokens,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(IDENTITY_SETTINGS) private readonly settings: IdentitySettings,
  ) {}

  async start(
    sessions: SessionRepository,
    userId: string,
    context: SessionContext,
  ): Promise<AuthTokens> {
    const now = this.clock.now()
    const refresh = this.opaqueTokens.generate()
    const session = startSession({
      id: this.ids.next(),
      userId,
      familyId: this.ids.next(),
      refreshTokenHash: refresh.hash,
      now,
      ttlDays: this.settings.refreshTokenTtlDays,
      ...context,
    })
    await sessions.insert(session)
    const access = await this.accessTokens.issue({ userId }, now)
    return toTokens(access, {
      token: refresh.token,
      expiresAt: session.expiresAt,
    })
  }
}
