import { Inject, Injectable } from '@nestjs/common'
import type { RefreshInput } from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  IDENTITY_UOW,
  OPAQUE_TOKENS,
  type IdentityUnitOfWork,
  type OpaqueTokens,
} from '../domain/ports'

// Sair encerra a família da sessão. Idempotente: token desconhecido ou já
// revogado não é erro.
@Injectable()
export class SignOutUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(OPAQUE_TOKENS) private readonly opaqueTokens: OpaqueTokens,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: RefreshInput): Promise<void> {
    await this.uow.run(async ({ sessions }) => {
      const session = await sessions.findByTokenHash(
        this.opaqueTokens.hash(input.refreshToken),
      )
      if (session) {
        await sessions.revokeFamily(session.familyId, this.clock.now())
      }
    })
  }
}
