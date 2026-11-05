import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import {
  adminUserListQuerySchema,
  userStatusSchema,
  uuidSchema,
  type AdminUserListQuery,
} from '@ufc-flow/contracts'

import {
  ApiJson,
  ApiProblems,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
import {
  ListUsersUseCase,
  SetUserStatusUseCase,
} from '../../application/admin-users.use-cases'
import { CreatePasswordResetLinkUseCase } from '../../application/create-password-reset-link.use-case'
import { LoadActorUseCase } from '../../application/load-actor.use-case'
import { AuthGuard, CurrentUserId } from './auth.guard'

@ApiTags('identity')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/admin/users')
export class AdminUsersController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(CreatePasswordResetLinkUseCase)
    private readonly createLink: CreatePasswordResetLinkUseCase,
    @Inject(ListUsersUseCase) private readonly listUsers: ListUsersUseCase,
    @Inject(SetUserStatusUseCase)
    private readonly setStatus: SetUserStatusUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Buscar usuários (admin)',
    description:
      'Por parte do nome ou do e-mail, das contas mais novas às mais antigas, paginada por cursor.',
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: userStatusSchema.options,
  })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiJson(200, 'Página de usuários', schemaRef('AdminUserPage'))
  @ApiProblems(400, 401, 403)
  async list(
    @CurrentUserId() actorId: string,
    @Query(new ZodValidationPipe(adminUserListQuerySchema))
    query: AdminUserListQuery,
  ) {
    return this.listUsers.execute(await this.loadActor.execute(actorId), query)
  }

  @Post(':userId/suspend')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Suspender conta (admin)',
    description:
      'Encerra as sessões; a pessoa não entra mais até ser reativada. Não vale para a própria conta nem para outro admin.',
  })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiJson(204, 'Conta suspensa')
  @ApiProblems(400, 401, 403, 404, 409)
  async suspend(
    @CurrentUserId() actorId: string,
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
  ) {
    await this.setStatus.suspend(await this.loadActor.execute(actorId), userId)
  }

  @Post(':userId/reactivate')
  @HttpCode(204)
  @ApiOperation({ summary: 'Reativar conta suspensa (admin)' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiJson(204, 'Conta reativada')
  @ApiProblems(400, 401, 403, 404)
  async reactivate(
    @CurrentUserId() actorId: string,
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
  ) {
    await this.setStatus.reactivate(
      await this.loadActor.execute(actorId),
      userId,
    )
  }

  @Post(':userId/password-reset-links')
  @ApiOperation({
    summary: 'Gerar link de redefinição de senha (admin)',
    description:
      'Sem SMTP na v2: o link vale por 24 horas, é de uso único e o admin o entrega por fora. Invalida os links anteriores.',
  })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiJson(201, 'Link gerado', schemaRef('PasswordResetLink'))
  @ApiProblems(400, 401, 403, 404)
  async create(
    @CurrentUserId() actorId: string,
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
  ) {
    return this.createLink.execute(
      await this.loadActor.execute(actorId),
      userId,
    )
  }
}
