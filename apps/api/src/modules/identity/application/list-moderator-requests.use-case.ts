import { Inject, Injectable } from '@nestjs/common'
import type {
  CursorPage,
  ModeratorRequest,
  ModeratorRequestStatus,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { decodeCursor, pageOf } from '../../../shared/domain/cursor'
import { IdentityErrors } from '../domain/errors'
import { IDENTITY_UOW, type IdentityUnitOfWork } from '../domain/ports'
import { toModeratorRequest } from './views'

// Fila de pedidos para o admin, do mais novo ao mais antigo
@Injectable()
export class ListModeratorRequestsUseCase {
  constructor(@Inject(IDENTITY_UOW) private readonly uow: IdentityUnitOfWork) {}

  async execute(
    actor: Actor,
    query: { status?: ModeratorRequestStatus; cursor?: string; limit: number },
  ): Promise<CursorPage<ModeratorRequest>> {
    if (!AccessPolicy.canAdministerPlatform(actor)) {
      throw IdentityErrors.accessDenied()
    }
    const before = decodeCursor(query.cursor)
    return this.uow.run(async ({ moderation }) => {
      const rows = await moderation.listRequests({
        status: query.status ?? null,
        before,
        limit: query.limit,
      })
      return pageOf(rows, query.limit, toModeratorRequest)
    })
  }
}
