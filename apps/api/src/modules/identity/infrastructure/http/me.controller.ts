import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import {
  ApiJson,
  ApiProblems,
  arrayOf,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
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
}
