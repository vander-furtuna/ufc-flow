import { Inject, Injectable } from '@nestjs/common'
import type { Me } from '@ufc-flow/contracts'

import { IDENTITY_UOW, type IdentityUnitOfWork } from '../domain/ports'
import { IDENTITY_SETTINGS, type IdentitySettings } from './identity-settings'
import { loadMe } from './views'

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(IDENTITY_SETTINGS) private readonly settings: IdentitySettings,
  ) {}

  async execute(userId: string): Promise<Me> {
    return this.uow.run((repos) =>
      loadMe(repos, userId, this.settings.consentVersions),
    )
  }
}
