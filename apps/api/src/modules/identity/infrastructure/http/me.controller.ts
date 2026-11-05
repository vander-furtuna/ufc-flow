import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import {
  accountDeletionInputSchema,
  avatarInputSchema,
  consentAcceptanceInputSchema,
  type AccountDeletionInput,
  type AvatarInput,
  type ConsentAcceptanceInput,
} from '@ufc-flow/contracts'

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
import {
  AcceptConsentsUseCase,
  DeleteAccountUseCase,
  ExportPersonalDataUseCase,
} from '../../application/account.use-cases'
import { GetMeUseCase } from '../../application/get-me.use-case'
import { ListMyModeratorRequestsUseCase } from '../../application/list-my-moderator-requests.use-case'
import { LoadActorUseCase } from '../../application/load-actor.use-case'
import { AuthGuard, CurrentUserId } from './auth.guard'

const MINUTE = 60_000

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
    @Inject(AcceptConsentsUseCase)
    private readonly acceptConsents: AcceptConsentsUseCase,
    @Inject(ExportPersonalDataUseCase)
    private readonly exportData: ExportPersonalDataUseCase,
    @Inject(DeleteAccountUseCase)
    private readonly deleteAccount: DeleteAccountUseCase,
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

  @Delete()
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  @ApiOperation({
    summary: 'Excluir a própria conta (LGPD)',
    description:
      'Pede a senha. Apaga de fato matrículas, histórico, horas, agendas, preferências, sessões, curtidas e arquivos pessoais. O que é da comunidade fica anonimizado: mensagens do fórum viram "mensagem removida", avaliações e posts do hub ficam sem autor. O último admin não pode excluir a conta.',
  })
  @ApiJsonBody('AccountDeletionInput')
  @ApiJson(204, 'Conta excluída')
  @ApiProblems(400, 401, 404, 409, 429)
  async remove(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(accountDeletionInputSchema))
    input: AccountDeletionInput,
  ) {
    await this.deleteAccount.execute(userId, input)
  }

  @Post('consents')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aceitar a versão vigente dos Termos e da Política',
    description:
      'Usado quando o Me traz pendingConsents. As versões enviadas precisam ser as vigentes; aceitar de novo não duplica.',
  })
  @ApiJsonBody('ConsentAcceptanceInput')
  @ApiJson(200, 'Usuário sem aceites pendentes', schemaRef('Me'))
  @ApiProblems(400, 401, 404, 409)
  consents(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(consentAcceptanceInputSchema))
    input: ConsentAcceptanceInput,
  ) {
    return this.acceptConsents.execute(userId, input)
  }

  @Get('export')
  @Throttle({ default: { limit: 10, ttl: 60 * MINUTE } })
  @Header('Cache-Control', 'no-store')
  @Header('Content-Disposition', 'attachment; filename="ufc-flow-dados.json"')
  @ApiOperation({
    summary: 'Exportar meus dados (LGPD)',
    description:
      'Tudo o que a conta guarda, em JSON (portabilidade). Arquivos vêm só com os metadados; o conteúdo se baixa por /v1/files/{id}.',
  })
  @ApiJson(200, 'Dados da conta', schemaRef('PersonalDataExport'))
  @ApiProblems(401, 404, 429)
  export(@CurrentUserId() userId: string) {
    return this.exportData.execute(userId)
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
