import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Put,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { avatarInputSchema, type AvatarInput } from '@ufc-flow/contracts'

import {
  ApiJson,
  ApiJsonBody,
  ApiProblems,
  arrayOf,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
import {
  RemoveAvatarUseCase,
  SetAvatarUseCase,
} from '../../application/avatar.use-cases'
import { GetMeUseCase } from '../../application/get-me.use-case'
import { ListMyModeratorRequestsUseCase } from '../../application/list-my-moderator-requests.use-case'
import { LoadActorUseCase } from '../../application/load-actor.use-case'
import { AuthGuard, CurrentUserId } from './auth.guard'

@ApiTags('identity')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/me')
export class MeController {
  constructor(
    @Inject(GetMeUseCase) private readonly getMe: GetMeUseCase,
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(ListMyModeratorRequestsUseCase)
    private readonly listMine: ListMyModeratorRequestsUseCase,
    @Inject(SetAvatarUseCase) private readonly setAvatar: SetAvatarUseCase,
    @Inject(RemoveAvatarUseCase)
    private readonly removeAvatar: RemoveAvatarUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Usuário logado',
    description: 'Dados da conta, papéis e cursos que a pessoa modera.',
  })
  @ApiJson(200, 'Usuário logado', schemaRef('Me'))
  @ApiProblems(401, 404)
  me(@CurrentUserId() userId: string) {
    return this.getMe.execute(userId)
  }

  @Get('moderator-requests')
  @ApiOperation({ summary: 'Meus pedidos de moderação' })
  @ApiJson(
    200,
    'Pedidos do usuário, do mais novo ao mais antigo',
    arrayOf('ModeratorRequest'),
  )
  @ApiProblems(401, 403)
  async myRequests(@CurrentUserId() userId: string) {
    return this.listMine.execute(await this.loadActor.execute(userId))
  }

  @Put('avatar')
  @ApiOperation({
    summary: 'Trocar a foto de perfil',
    description:
      'Recebe o id de um arquivo AVATAR enviado pela própria pessoa (POST /v1/files). A foto anterior é apagada pela limpeza diária.',
  })
  @ApiJsonBody('AvatarInput')
  @ApiJson(200, 'Usuário com a foto nova', schemaRef('Me'))
  @ApiProblems(400, 401, 404, 409)
  avatar(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(avatarInputSchema)) input: AvatarInput,
  ) {
    return this.setAvatar.execute(userId, input.fileId)
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Remover a foto de perfil' })
  @ApiJson(200, 'Usuário sem foto (o web mostra as iniciais)', schemaRef('Me'))
  @ApiProblems(401, 404)
  deleteAvatar(@CurrentUserId() userId: string) {
    return this.removeAvatar.execute(userId)
  }
}
