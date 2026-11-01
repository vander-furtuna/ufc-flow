import { Controller, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { uuidSchema } from '@ufc-flow/contracts'

import {
  ApiJson,
  ApiProblems,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
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
  ) {}

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
