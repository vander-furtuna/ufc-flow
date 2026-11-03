import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
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
  forumQuerySchema,
  messageInputSchema,
  newMessagesQuerySchema,
  slugSchema,
  subjectCodeSchema,
  subjectSearchQuerySchema,
  uuidSchema,
  type ForumQuery,
  type ParsedMessageInput,
  type SubjectSearchQuery,
} from '@ufc-flow/contracts'
import type { z } from 'zod'

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
  ReadForumUseCase,
  SearchSubjectsUseCase,
  WriteForumUseCase,
} from '../../application/forum.use-cases'

const idParam = new ZodValidationPipe(uuidSchema)
const slugParam = new ZodValidationPipe(slugSchema)
const codeParam = new ZodValidationPipe(subjectCodeSchema)
const messageBody = new ZodValidationPipe(messageInputSchema)
const pageQuery = new ZodValidationPipe(forumQuerySchema)
const MESSAGE = schemaRef('Message')
const PAGE = schemaRef('MessagePage')
const COURSE = { name: 'course', example: 'engenharia-de-computacao' }
const ID = { name: 'id', format: 'uuid' }

// Fórum do curso, como o X e sem tempo real: lê quem está logado; escreve
// quem tem matrícula ativa no curso, a moderação e admins
@ApiTags('forum')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1')
export class ForumController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(ReadForumUseCase) private readonly read: ReadForumUseCase,
    @Inject(WriteForumUseCase) private readonly write: WriteForumUseCase,
  ) {}

  private actor(userId: string): Promise<Actor> {
    return this.loadActor.execute(userId)
  }

  @Get('courses/:course/forum/messages')
  @ApiOperation({
    summary: 'Timeline do fórum',
    description:
      'Só mensagens raiz, das mais novas para as mais antigas. Tiradas do ar com respostas vêm sem conteúdo; ocultas só para o autor e a moderação.',
  })
  @ApiParam(COURSE)
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiJson(200, 'Página da timeline', PAGE)
  @ApiProblems(400, 401, 403, 404)
  async timeline(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Query(pageQuery) query: ForumQuery,
  ) {
    return this.read.timeline(await this.actor(userId), course, query)
  }

  @Get('courses/:course/forum/messages/new-count')
  @ApiOperation({
    summary: 'Mensagens novas na timeline',
    description:
      'Raízes visíveis de outras pessoas publicadas depois de since (a mais nova carregada). O web consulta a cada 60 s.',
  })
  @ApiParam(COURSE)
  @ApiQuery({ name: 'since', example: '2026-11-03T12:00:00.000Z' })
  @ApiJson(200, 'Contagem', schemaRef('NewMessagesCount'))
  @ApiProblems(400, 401, 403, 404)
  async newCount(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Query(new ZodValidationPipe(newMessagesQuerySchema))
    query: z.output<typeof newMessagesQuerySchema>,
  ) {
    return this.read.newCount(
      await this.actor(userId),
      course,
      new Date(query.since),
    )
  }

  @Post('courses/:course/forum/messages')
  @ApiOperation({
    summary: 'Publicar no fórum',
    description:
      'Até 500 caracteres e 5 disciplinas citadas como @CÓDIGO. Limite de envio por pessoa (429).',
  })
  @ApiParam(COURSE)
  @ApiJsonBody('MessageInput')
  @ApiJson(201, 'Mensagem publicada', MESSAGE)
  @ApiProblems(400, 401, 403, 404, 429)
  async post(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Body(messageBody) input: ParsedMessageInput,
  ) {
    return this.write.post(await this.actor(userId), course, input)
  }

  @Get('courses/:course/forum/trending-subjects')
  @ApiOperation({
    summary: 'Disciplinas mais citadas na semana',
    description: 'As 5 mais citadas em mensagens visíveis dos últimos 7 dias.',
  })
  @ApiParam(COURSE)
  @ApiJson(200, 'Disciplinas', arrayOf('TrendingSubject'))
  @ApiProblems(400, 401, 403, 404)
  async trending(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
  ) {
    return this.read.trending(await this.actor(userId), course)
  }

  @Get('courses/:course/forum/subjects/:code/messages')
  @ApiOperation({
    summary: 'Mensagens que citam a disciplina',
    description:
      'Aba "Discussões" da disciplina: mensagens visíveis do fórum do curso, das mais novas.',
  })
  @ApiParam(COURSE)
  @ApiParam({ name: 'code', example: 'ECO0036' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiJson(200, 'Página de mensagens', PAGE)
  @ApiProblems(400, 401, 403, 404)
  async bySubject(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Param('code', codeParam) code: string,
    @Query(pageQuery) query: ForumQuery,
  ) {
    return this.read.bySubject(await this.actor(userId), course, code, query)
  }

  @Get('forum/messages/:id')
  @ApiOperation({
    summary: 'Conversa',
    description:
      'A cadeia até a raiz, a mensagem e a primeira página de respostas diretas.',
  })
  @ApiParam(ID)
  @ApiJson(200, 'Conversa', schemaRef('Conversation'))
  @ApiProblems(400, 401, 403, 404)
  async conversation(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.read.conversation(await this.actor(userId), id)
  }

  @Get('forum/messages/:id/replies')
  @ApiOperation({
    summary: 'Respostas da mensagem',
    description: 'Respostas diretas, das mais antigas para as mais novas.',
  })
  @ApiParam(ID)
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiJson(200, 'Página de respostas', PAGE)
  @ApiProblems(400, 401, 403, 404)
  async replies(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Query(pageQuery) query: ForumQuery,
  ) {
    return this.read.replies(await this.actor(userId), id, query)
  }

  @Post('forum/messages/:id/replies')
  @ApiOperation({
    summary: 'Responder',
    description:
      'Avisa o autor da mensagem respondida e quem já escreveu na conversa.',
  })
  @ApiParam(ID)
  @ApiJsonBody('MessageInput')
  @ApiJson(201, 'Resposta publicada', MESSAGE)
  @ApiProblems(400, 401, 403, 404, 409, 429)
  async reply(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(messageBody) input: ParsedMessageInput,
  ) {
    return this.write.reply(await this.actor(userId), id, input)
  }

  @Put('forum/messages/:id')
  @ApiOperation({
    summary: 'Editar mensagem',
    description: 'Só o autor, até 15 minutos depois do envio.',
  })
  @ApiParam(ID)
  @ApiJsonBody('MessageInput')
  @ApiJson(200, 'Mensagem editada', MESSAGE)
  @ApiProblems(400, 401, 403, 404, 409)
  async edit(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(messageBody) input: ParsedMessageInput,
  ) {
    return this.write.edit(await this.actor(userId), id, input)
  }

  @Delete('forum/messages/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Apagar a própria mensagem',
    description:
      'Sem respostas, some; com respostas, o conteúdo sai e fica "mensagem apagada".',
  })
  @ApiParam(ID)
  @ApiJson(204, 'Mensagem apagada')
  @ApiProblems(400, 401, 403, 404, 409)
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    await this.write.remove(await this.actor(userId), id)
  }

  @Put('forum/messages/:id/like')
  @ApiOperation({ summary: 'Curtir' })
  @ApiParam(ID)
  @ApiJson(200, 'Curtidas', schemaRef('LikeState'))
  @ApiProblems(400, 401, 403, 404, 409)
  async like(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.write.like(await this.actor(userId), id)
  }

  @Delete('forum/messages/:id/like')
  @ApiOperation({ summary: 'Descurtir' })
  @ApiParam(ID)
  @ApiJson(200, 'Curtidas', schemaRef('LikeState'))
  @ApiProblems(400, 401, 403, 404)
  async unlike(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.write.unlike(await this.actor(userId), id)
  }
}

// Busca do popover de @, pública como o catálogo
@ApiTags('forum')
@Controller('v1')
export class SubjectSearchController {
  constructor(
    @Inject(SearchSubjectsUseCase)
    private readonly search: SearchSubjectsUseCase,
  ) {}

  @Get('courses/:course/subjects/search')
  @ApiOperation({
    summary: 'Buscar disciplinas para citar',
    description:
      'Por código ou nome, sem acentos. Disciplinas da EC vigente do curso primeiro (com período e natureza), depois as de outros cursos.',
  })
  @ApiParam(COURSE)
  @ApiQuery({ name: 'q', example: 'calc' })
  @ApiQuery({ name: 'limit', required: false, example: 8 })
  @ApiJson(200, 'Disciplinas', arrayOf('SubjectSearchResult'))
  @ApiProblems(400, 404)
  execute(
    @Param('course', slugParam) course: string,
    @Query(new ZodValidationPipe(subjectSearchQuerySchema))
    query: SubjectSearchQuery,
  ) {
    return this.search.execute(course, query)
  }
}
