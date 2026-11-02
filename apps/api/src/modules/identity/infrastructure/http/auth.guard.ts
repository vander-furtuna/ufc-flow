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

// Rotas abertas que mudam com quem está logado (arquivo privado do dono):
// lê o token se vier, sem exigir
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKENS) private readonly accessTokens: AccessTokens,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const [scheme, token] = (request.headers.authorization ?? '').split(' ')
    if (scheme === 'Bearer' && token) {
      const claims = await this.accessTokens.verify(token)
      if (claims) request.userId = claims.userId
    }
    return true
  }
}

// null quando a rota usa o OptionalAuthGuard e não há sessão
export const OptionalUserId = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().userId ?? null,
)

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
