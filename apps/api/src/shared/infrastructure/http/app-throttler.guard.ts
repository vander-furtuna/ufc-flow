import { Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler'
import type { Request } from 'express'

// Conta as tentativas por IP e, quando há e-mail no corpo, por IP e e-mail:
// uma senha errada não bloqueia todo mundo atrás do mesmo IP da universidade
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  // Tokens explícitos: sem emitDecoratorMetadata, o Reflector não seria
  // resolvido pelo tipo
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
  ) {
    super(options, storage, reflector)
  }

  protected override async getTracker(request: Request): Promise<string> {
    const email = (request.body as { email?: unknown } | undefined)?.email
    const ip = request.ip ?? 'desconhecido'
    return typeof email === 'string' ? `${ip}:${email.toLowerCase()}` : ip
  }
}
