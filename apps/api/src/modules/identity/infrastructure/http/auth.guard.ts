import {
  createParamDecorator,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import type { Request } from 'express'

import { DomainError } from '../../../../shared/domain/domain-error'
import { ACCESS_TOKENS, type AccessTokens } from '../../domain/ports'

type AuthenticatedRequest = Request & { userId?: string }

// Exige um token de acesso válido (Authorization: Bearer). O que a pessoa
// pode fazer é decidido depois, pela AccessPolicy no caso de uso.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKENS) private readonly accessTokens: AccessTokens,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const [scheme, token] = (request.headers.authorization ?? '').split(' ')
    const claims =
      scheme === 'Bearer' && token
        ? await this.accessTokens.verify(token)
        : null
    if (!claims) {
      throw new DomainError(
        'AUTHENTICATION_REQUIRED',
        'UNAUTHORIZED',
        'Entre na sua conta para continuar',
      )
    }
    request.userId = claims.userId
    return true
  }
}

export const CurrentUserId = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().userId!,
)

// Navegador e IP gravados na sessão
export const SessionContextParam = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>()
    return {
      userAgent: request.headers['user-agent']?.slice(0, 500) ?? null,
      ip: request.ip ?? null,
    }
  },
)
