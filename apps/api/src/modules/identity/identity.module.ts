import { Module } from '@nestjs/common'

import { CONSENT_VERSIONS } from '@ufc-flow/contracts'

import { ENV, type Env } from '../../config/env'
import {
  AcceptConsentsUseCase,
  DeleteAccountUseCase,
  ExportPersonalDataUseCase,
} from './application/account.use-cases'
import {
  ListUsersUseCase,
  SetUserStatusUseCase,
} from './application/admin-users.use-cases'
import { CancelModeratorRequestUseCase } from './application/cancel-moderator-request.use-case'
import { CreatePasswordResetLinkUseCase } from './application/create-password-reset-link.use-case'
import {
  RemoveAvatarUseCase,
  SetAvatarUseCase,
} from './application/avatar.use-cases'
import { GetMeUseCase } from './application/get-me.use-case'
import {
  IDENTITY_SETTINGS,
  type IdentitySettings,
} from './application/identity-settings'
import { ListModeratorRequestsUseCase } from './application/list-moderator-requests.use-case'
import { ListMyModeratorRequestsUseCase } from './application/list-my-moderator-requests.use-case'
import { LoadActorUseCase } from './application/load-actor.use-case'
import { RefreshSessionUseCase } from './application/refresh-session.use-case'
import { RequestModerationUseCase } from './application/request-moderation.use-case'
import { ResetPasswordUseCase } from './application/reset-password.use-case'
import { ReviewModeratorRequestUseCase } from './application/review-moderator-request.use-case'
import { SessionIssuer } from './application/session-issuer'
import { SignInUseCase } from './application/sign-in.use-case'
import { SignOutUseCase } from './application/sign-out.use-case'
import { SignUpUseCase } from './application/sign-up.use-case'
import {
  ACCESS_TOKENS,
  IDENTITY_UOW,
  OPAQUE_TOKENS,
  PASSWORD_HASHER,
} from './domain/ports'
import { AdminUsersController } from './infrastructure/http/admin-users.controller'
import { AuthController } from './infrastructure/http/auth.controller'
import { AuthGuard, OptionalAuthGuard } from './infrastructure/http/auth.guard'
import { MeController } from './infrastructure/http/me.controller'
import { ModerationController } from './infrastructure/http/moderation.controller'
import { DrizzleIdentityUnitOfWork } from './infrastructure/persistence/drizzle-identity'
import {
  Argon2PasswordHasher,
  CryptoOpaqueTokens,
  JoseAccessTokens,
} from './infrastructure/security/security-adapters'

@Module({
  controllers: [
    AuthController,
    MeController,
    ModerationController,
    AdminUsersController,
  ],
  providers: [
    { provide: IDENTITY_UOW, useClass: DrizzleIdentityUnitOfWork },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: OPAQUE_TOKENS, useClass: CryptoOpaqueTokens },
    {
      provide: ACCESS_TOKENS,
      inject: [ENV],
      useFactory: (env: Env) =>
        new JoseAccessTokens(env.JWT_SECRET, env.ACCESS_TOKEN_TTL_SECONDS),
    },
    {
      provide: IDENTITY_SETTINGS,
      inject: [ENV],
      useFactory: (env: Env): IdentitySettings => ({
        refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
        webUrl: env.WEB_URL,
        consentVersions: CONSENT_VERSIONS,
      }),
    },
    AuthGuard,
    OptionalAuthGuard,
    SessionIssuer,
    SignUpUseCase,
    SignInUseCase,
    RefreshSessionUseCase,
    SignOutUseCase,
    GetMeUseCase,
    SetAvatarUseCase,
    RemoveAvatarUseCase,
    LoadActorUseCase,
    CreatePasswordResetLinkUseCase,
    ResetPasswordUseCase,
    RequestModerationUseCase,
    ListModeratorRequestsUseCase,
    ListMyModeratorRequestsUseCase,
    ReviewModeratorRequestUseCase,
    CancelModeratorRequestUseCase,
    AcceptConsentsUseCase,
    ExportPersonalDataUseCase,
    DeleteAccountUseCase,
    ListUsersUseCase,
    SetUserStatusUseCase,
  ],
  exports: [AuthGuard, OptionalAuthGuard, LoadActorUseCase, ACCESS_TOKENS],
})
export class IdentityModule {}
