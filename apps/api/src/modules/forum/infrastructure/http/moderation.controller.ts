import {
  Body,
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
  dismissReportsInputSchema,
  liftRestrictionInputSchema,
  messageModerationInputSchema,
  reportInputSchema,
  restrictionInputSchema,
  slugSchema,
  uuidSchema,
  type DismissReportsInput,
  type LiftRestrictionInput,
  type MessageModerationInput,
  type ParsedReportInput,
  type RestrictionInput,
} from '@ufc-flow/contracts'
import { z } from 'zod'

import type { Actor } from '../../../../shared/domain/access-policy'
import {
  ApiJson,
  ApiJsonBody,
  ApiProblems,
  arrayOf,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
import { LoadActorUseCase } from '../../../identity/application/load-actor.use-case'
import {
  AuthGuard,
  CurrentUserId,
} from '../../../identity/infrastructure/http/auth.guard'
import {
  ModerateMessageUseCase,
  ModerationQueueUseCase,
  ReportMessageUseCase,
  RestrictUserUseCase,
} from '../../application/moderation.use-cases'

const idParam = new ZodValidationPipe(uuidSchema)
const slugParam = new ZodValidationPipe(slugSchema)
const scopeQuery = new ZodValidationPipe(
  z.object({ course: slugSchema.optional() }),
)
const ID = { name: 'id', format: 'uuid' }
const COURSE_QUERY = {
  name: 'course',
  required: false,
  example: 'engenharia-de-computacao',
  description: 'Só um curso; sem ele, todos os que a pessoa modera',
}

// Denúncias, ações da moderação e restrições do fórum. Denunciar é de
// qualquer leitor; o resto, da moderação do curso e de admins.
@ApiTags('moderation')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1')
export class ModerationController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(ReportMessageUseCase) private readonly report: ReportMessageUseCase,
    @Inject(ModerateMessageUseCase)
    private readonly moderate: ModerateMessageUseCase,
    @Inject(RestrictUserUseCase) private readonly restrict: RestrictUserUseCase,
    @Inject(ModerationQueueUseCase)
    private readonly queue: ModerationQueueUseCase,
  ) {}

  private actor(userId: string): Promise<Actor> {
    return this.loadActor.execute(userId)
  }

  @Post('forum/messages/:id/reports')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Denunciar mensagem',
    description:
      'Uma vez por pessoa, com motivo. Com 3 denúncias abertas de pessoas diferentes, a mensagem fica oculta até a moderação decidir.',
  })
  @ApiParam(ID)
  @ApiJsonBody('ReportInput')
  @ApiJson(204, 'Denúncia registrada')
  @ApiProblems(400, 401, 403, 404, 409)
  async reportMessage(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(reportInputSchema)) input: ParsedReportInput,
  ) {
    await this.report.execute(await this.actor(userId), id, input)
  }

  @Post('forum/messages/:id/moderation')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ocultar, remover ou restaurar mensagem',
    description:
      'Moderação do curso ou admin, com motivo. Ocultar ou remover aceita as denúncias abertas; restaurar as descarta. A remoção mostra só a categoria para os leitores.',
  })
  @ApiParam(ID)
  @ApiJsonBody('MessageModerationInput')
  @ApiJson(200, 'Mensagem moderada', schemaRef('Message'))
  @ApiProblems(400, 401, 403, 404, 409)
  async moderateMessage(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(messageModerationInputSchema))
    input: MessageModerationInput,
  ) {
    return this.moderate.execute(await this.actor(userId), id, input)
  }

  @Post('forum/messages/:id/reports/dismiss')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Descartar denúncias',
    description: 'Fecha as denúncias abertas; a mensagem oculta volta ao ar.',
  })
  @ApiParam(ID)
  @ApiJsonBody('DismissReportsInput')
  @ApiJson(204, 'Denúncias descartadas')
  @ApiProblems(400, 401, 403, 404, 409)
  async dismiss(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(dismissReportsInputSchema))
    input: DismissReportsInput,
  ) {
    await this.moderate.dismiss(await this.actor(userId), id, input)
  }

  @Post('moderation/restrictions')
  @ApiOperation({
    summary: 'Silenciar ou banir no fórum do curso',
    description:
      'MUTE: lê, mas não escreve nem curte. BAN: não acessa o fórum do curso. Prazo em dias ou sem prazo; a nova substitui a ativa. Moderadores do curso e admins não podem ser restringidos.',
  })
  @ApiJsonBody('RestrictionInput')
  @ApiJson(201, 'Restrição criada', schemaRef('Restriction'))
  @ApiProblems(400, 401, 403, 404)
  async restrictUser(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(restrictionInputSchema))
    input: RestrictionInput,
  ) {
    return this.restrict.restrict(await this.actor(userId), input)
  }

  @Post('moderation/restrictions/:id/lift')
  @HttpCode(204)
  @ApiOperation({ summary: 'Suspender restrição' })
  @ApiParam(ID)
  @ApiJsonBody('LiftRestrictionInput')
  @ApiJson(204, 'Restrição suspensa')
  @ApiProblems(400, 401, 403, 404)
  async lift(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(liftRestrictionInputSchema))
    input: LiftRestrictionInput,
  ) {
    await this.restrict.lift(await this.actor(userId), id, input)
  }

  @Get('moderation/reports')
  @ApiOperation({
    summary: 'Fila de denúncias',
    description:
      'Mensagens com denúncias abertas, agrupadas por motivo, com o texto do momento da denúncia. As ocultas automaticamente primeiro.',
  })
  @ApiQuery(COURSE_QUERY)
  @ApiJson(200, 'Fila', arrayOf('ReportQueueItem'))
  @ApiProblems(400, 401, 403, 404)
  async reports(
    @CurrentUserId() userId: string,
    @Query(scopeQuery) query: { course?: string },
  ) {
    return this.queue.reports(await this.actor(userId), query.course)
  }

  @Get('moderation/restrictions')
  @ApiOperation({ summary: 'Restrições ativas' })
  @ApiQuery(COURSE_QUERY)
  @ApiJson(200, 'Restrições', arrayOf('Restriction'))
  @ApiProblems(400, 401, 403, 404)
  async restrictions(
    @CurrentUserId() userId: string,
    @Query(scopeQuery) query: { course?: string },
  ) {
    return this.queue.restrictions(await this.actor(userId), query.course)
  }

  @Get('moderation/summary')
  @ApiOperation({
    summary: 'Contadores da moderação',
    description:
      'Denúncias abertas e restrições ativas dos cursos moderados; pedidos de moderação pendentes só para admin.',
  })
  @ApiJson(200, 'Contadores', schemaRef('ModerationSummary'))
  @ApiProblems(401, 403)
  async summary(@CurrentUserId() userId: string) {
    return this.queue.summary(await this.actor(userId))
  }

  @Get('courses/:course/forum/my-restriction')
  @ApiOperation({
    summary: 'Minha restrição no fórum do curso',
    description: 'Nulo quando a pessoa não está silenciada nem banida.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJson(200, 'Restrição ou nulo', schemaRef('MyRestriction'))
  @ApiProblems(400, 401, 404)
  async mine(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
  ) {
    return this.queue.mine(await this.actor(userId), course)
  }
}
