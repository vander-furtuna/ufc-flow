import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import {
  refreshInputSchema,
  resetPasswordInputSchema,
  signInInputSchema,
  signUpInputSchema,
  type RefreshInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from '@ufc-flow/contracts'

import {
  ApiJson,
  ApiJsonBody,
  ApiProblems,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
import { RefreshSessionUseCase } from '../../application/refresh-session.use-case'
import { ResetPasswordUseCase } from '../../application/reset-password.use-case'
import type { SessionContext } from '../../application/session-issuer'
import { SignInUseCase } from '../../application/sign-in.use-case'
import { SignOutUseCase } from '../../application/sign-out.use-case'
import { SignUpUseCase } from '../../application/sign-up.use-case'
import { SessionContextParam } from './auth.guard'

const MINUTE = 60_000

@ApiTags('identity')
@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject(SignUpUseCase) private readonly signUp: SignUpUseCase,
    @Inject(SignInUseCase) private readonly signIn: SignInUseCase,
    @Inject(RefreshSessionUseCase)
    private readonly refreshSession: RefreshSessionUseCase,
    @Inject(SignOutUseCase) private readonly signOut: SignOutUseCase,
    @Inject(ResetPasswordUseCase)
    private readonly resetPassword: ResetPasswordUseCase,
  ) {}

  @Post('sign-up')
  @Throttle({ default: { limit: 10, ttl: 60 * MINUTE } })
  @ApiOperation({
    summary: 'Criar conta',
    description:
      'Cria a conta com o aceite de Termos e Privacidade e já devolve a sessão.',
  })
  @ApiJsonBody('SignUpInput')
  @ApiJson(201, 'Conta criada e sessão aberta', schemaRef('AuthSession'))
  @ApiProblems(400, 409, 429)
  createAccount(
    @Body(new ZodValidationPipe(signUpInputSchema)) input: SignUpInput,
    @SessionContextParam() context: SessionContext,
  ) {
    return this.signUp.execute(input, context)
  }

  @Post('sign-in')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  @ApiOperation({
    summary: 'Entrar',
    description:
      'Entra com e-mail e senha. Cinco tentativas por minuto para cada e-mail e IP.',
  })
  @ApiJsonBody('SignInInput')
  @ApiJson(200, 'Sessão aberta', schemaRef('AuthSession'))
  @ApiProblems(400, 401, 403, 429)
  enter(
    @Body(new ZodValidationPipe(signInInputSchema)) input: SignInInput,
    @SessionContextParam() context: SessionContext,
  ) {
    return this.signIn.execute(input, context)
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  @ApiOperation({
    summary: 'Renovar a sessão',
    description:
      'Troca o token de renovação por um par novo. Reusar um token já trocado encerra a sessão em todos os aparelhos daquele login.',
  })
  @ApiJsonBody('RefreshInput')
  @ApiJson(200, 'Tokens renovados', schemaRef('AuthTokens'))
  @ApiProblems(400, 401, 403, 429)
  refresh(
    @Body(new ZodValidationPipe(refreshInputSchema)) input: RefreshInput,
    @SessionContextParam() context: SessionContext,
  ) {
    return this.refreshSession.execute(input, context)
  }

  @Post('sign-out')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Sair',
    description: 'Encerra a sessão do token de renovação informado.',
  })
  @ApiJsonBody('RefreshInput')
  @ApiJson(204, 'Sessão encerrada')
  @ApiProblems(400)
  async leave(
    @Body(new ZodValidationPipe(refreshInputSchema)) input: RefreshInput,
  ) {
    await this.signOut.execute(input)
  }

  @Post('password-reset')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @ApiOperation({
    summary: 'Redefinir a senha pelo link',
    description:
      'Usa o token do link gerado por um administrador. Encerra todas as sessões da conta.',
  })
  @ApiJsonBody('ResetPasswordInput')
  @ApiJson(204, 'Senha trocada')
  @ApiProblems(400, 429)
  async reset(
    @Body(new ZodValidationPipe(resetPasswordInputSchema))
    input: ResetPasswordInput,
  ) {
    await this.resetPassword.execute(input)
  }
}
