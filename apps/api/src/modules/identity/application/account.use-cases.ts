import { Inject, Injectable } from '@nestjs/common'
import type {
  AccountDeletionInput,
  ConsentAcceptanceInput,
  Me,
  PersonalDataExport,
} from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  EVENT_PUBLISHER,
  type EventPublisher,
} from '../../../shared/domain/events'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import {
  assertCanDeleteAccount,
  assertCurrentVersions,
  pendingConsents,
} from '../domain/account'
import { IdentityErrors } from '../domain/errors'
import {
  IDENTITY_UOW,
  PASSWORD_HASHER,
  type IdentityUnitOfWork,
  type PasswordHasher,
} from '../domain/ports'
import { IDENTITY_SETTINGS, type IdentitySettings } from './identity-settings'
import { loadMe } from './views'

// Novo aceite de Termos e Política quando a versão muda (D46)
@Injectable()
export class AcceptConsentsUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(IDENTITY_SETTINGS) private readonly settings: IdentitySettings,
  ) {}

  async execute(userId: string, input: ConsentAcceptanceInput): Promise<Me> {
    const versions = this.settings.consentVersions
    assertCurrentVersions(input, versions)
    return this.uow.run(async (repos) => {
      const user = await repos.users.findById(userId)
      if (!user) throw IdentityErrors.userNotFound()
      const pending = pendingConsents(
        await repos.users.consentsOf(userId),
        versions,
      )
      const now = this.clock.now()
      await repos.users.insertConsents(
        pending.map((document) => ({
          id: this.ids.next(),
          userId,
          document,
          version: document === 'TERMS' ? versions.terms : versions.privacy,
          acceptedAt: now,
        })),
      )
      return loadMe(repos, user, versions)
    })
  }
}

// Portabilidade (LGPD): tudo o que é da pessoa, em JSON
@Injectable()
export class ExportPersonalDataUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(userId: string): Promise<PersonalDataExport> {
    return this.uow.run(async ({ users, personalData }) => {
      const user = await users.findById(userId)
      if (!user) throw IdentityErrors.userNotFound()
      return {
        format: 'ufc-flow-export/v1',
        exportedAt: this.clock.now().toISOString(),
        account: {
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          roles: await users.rolesOf(userId),
          avatarFileId: user.avatarFileId ?? null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        ...(await personalData.collect(userId)),
      }
    })
  }
}

// Exclusão pela própria pessoa (LGPD). Apaga os dados pessoais e anonimiza o
// que pertence à comunidade; vale também para conta suspensa.
@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(userId: string, input: AccountDeletionInput): Promise<void> {
    const now = await this.uow.run(async ({ users, personalData, audit }) => {
      const user = await users.findById(userId)
      if (!user) throw IdentityErrors.userNotFound()
      if (!(await this.hasher.verify(user.passwordHash, input.password))) {
        throw IdentityErrors.passwordMismatch()
      }
      assertCanDeleteAccount(
        await users.rolesOf(userId),
        await users.countAdmins(),
      )
      const at = this.clock.now()
      await personalData.erase(userId, at)
      // Sem nome nem e-mail: só que a conta existiu e foi excluída
      await audit.record({
        id: this.ids.next(),
        actorId: null,
        module: 'identity',
        entity: 'user',
        entityId: userId,
        action: 'account.deleted',
        changes: null,
        createdAt: at,
      })
      return at
    })
    this.events.publish([{ type: 'AccountDeleted', userId, occurredAt: now }])
  }
}
