import { Inject, Injectable } from '@nestjs/common'
import type { Me } from '@ufc-flow/contracts'

import { CLOCK, type Clock } from '../../../shared/domain/clock'
import { FilesErrors } from '../../files/domain/errors'
import {
  attachFile,
  checkAttachable,
  markDeleted,
} from '../../files/domain/file'
import { IdentityErrors } from '../domain/errors'
import {
  IDENTITY_UOW,
  type IdentityRepositories,
  type IdentityUnitOfWork,
} from '../domain/ports'
import { IDENTITY_SETTINGS, type IdentitySettings } from './identity-settings'
import { loadMe } from './views'

// A foto anterior é solta e o job de limpeza a apaga do disco
async function releaseAvatar(
  repos: IdentityRepositories,
  fileId: string | null | undefined,
  now: Date,
) {
  if (!fileId) return
  const previous = await repos.files.findById(fileId)
  if (previous) await repos.files.save(markDeleted(previous, now))
}

// Troca a foto de perfil por um arquivo AVATAR enviado pela própria pessoa
@Injectable()
export class SetAvatarUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(IDENTITY_SETTINGS) private readonly settings: IdentitySettings,
  ) {}

  execute(userId: string, fileId: string): Promise<Me> {
    return this.uow.run(async (repos) => {
      const user = await repos.users.findById(userId)
      if (!user) throw IdentityErrors.userNotFound()
      if (user.avatarFileId === fileId)
        return loadMe(repos, userId, this.settings.consentVersions)
      const file = await repos.files.findById(fileId)
      if (!file) throw FilesErrors.fileNotFound()
      checkAttachable(file, { ownerId: userId, purpose: 'AVATAR' })
      const now = this.clock.now()
      await repos.files.save(attachFile(file, now))
      await releaseAvatar(repos, user.avatarFileId, now)
      await repos.users.setAvatar(userId, fileId, now)
      return loadMe(repos, userId, this.settings.consentVersions)
    })
  }
}

@Injectable()
export class RemoveAvatarUseCase {
  constructor(
    @Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(IDENTITY_SETTINGS) private readonly settings: IdentitySettings,
  ) {}

  execute(userId: string): Promise<Me> {
    return this.uow.run(async (repos) => {
      const user = await repos.users.findById(userId)
      if (!user) throw IdentityErrors.userNotFound()
      const now = this.clock.now()
      await releaseAvatar(repos, user.avatarFileId, now)
      await repos.users.setAvatar(userId, null, now)
      return loadMe(repos, userId, this.settings.consentVersions)
    })
  }
}
