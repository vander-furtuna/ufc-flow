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
  hubQuerySchema,
  postInputSchema,
  slugSchema,
  uuidSchema,
  type HubQuery,
  type ParsedPostInput,
} from '@ufc-flow/contracts'

import { ANONYMOUS, type Actor } from '../../../../shared/domain/access-policy'
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
  OptionalAuthGuard,
  OptionalUserId,
} from '../../../identity/infrastructure/http/auth.guard'
import {
  GetHubDeadlinesUseCase,
  GetHubFeedUseCase,
  GetPostUseCase,
  HubReadsUseCase,
  SavePostUseCase,
} from '../../application/hub.use-cases'

const idParam = new ZodValidationPipe(uuidSchema)
const slugParam = new ZodValidationPipe(slugSchema)
const postBody = new ZodValidationPipe(postInputSchema)
const POST = schemaRef('Post')

// Hub do curso: leitura pública; posts por moderadores do curso e admins. O
// post institucional (sem curso) aparece no hub de todos os cursos.
@ApiTags('hub')
@Controller('v1')
export class HubController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(GetHubFeedUseCase) private readonly feed: GetHubFeedUseCase,
    @Inject(GetPostUseCase) private readonly getPost: GetPostUseCase,
    @Inject(GetHubDeadlinesUseCase)
    private readonly getDeadlines: GetHubDeadlinesUseCase,
    @Inject(SavePostUseCase) private readonly save: SavePostUseCase,
    @Inject(HubReadsUseCase) private readonly reads: HubReadsUseCase,
  ) {}

  private actor(userId: string | null): Promise<Actor> {
    return userId ? this.loadActor.execute(userId) : Promise.resolve(ANONYMOUS)
  }

  @Get('courses/:course/hub')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Feed do hub do curso',
    description:
      'Fixados à parte, só na primeira página; os demais por data de publicação. Inclui os institucionais. Rascunhos e arquivados (status) só para quem modera o curso. upcoming=true deixa só eventos que não terminaram; q busca no título e no resumo, sem acentos.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiQuery({ name: 'type', required: false, example: 'EVENT' })
  @ApiQuery({ name: 'upcoming', required: false, example: 'true' })
  @ApiQuery({ name: 'q', required: false, example: 'monitoria' })
  @ApiQuery({ name: 'status', required: false, example: 'PUBLISHED' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiJson(200, 'Página do feed', schemaRef('HubFeed'))
  @ApiProblems(400, 403, 404)
  async hub(
    @OptionalUserId() userId: string | null,
    @Param('course', slugParam) course: string,
    @Query(new ZodValidationPipe(hubQuerySchema)) query: HubQuery,
  ) {
    return this.feed.execute(await this.actor(userId), course, query)
  }

  @Get('courses/:course/hub/deadlines')
  @ApiOperation({
    summary: 'Próximos prazos do hub',
    description:
      'Os 5 mais próximos: prazos de bolsas e editais abertos e eventos que ainda não começaram.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJson(200, 'Prazos', arrayOf('HubDeadline'))
  @ApiProblems(400, 404)
  deadlines(@Param('course', slugParam) course: string) {
    return this.getDeadlines.execute(course)
  }

  @Get('courses/:course/hub/posts/:slug')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Post do hub',
    description:
      'Pelo slug; o do curso tem prioridade sobre o institucional de mesmo slug. Rascunho e arquivado só para quem modera.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiParam({ name: 'slug', example: 'selecao-de-monitores-2026-2' })
  @ApiJson(200, 'Post', POST)
  @ApiProblems(400, 404)
  async post(
    @OptionalUserId() userId: string | null,
    @Param('course', slugParam) course: string,
    @Param('slug', slugParam) slug: string,
  ) {
    return this.getPost.execute(await this.actor(userId), course, slug)
  }

  @Post('courses/:course/hub/posts')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Criar post no hub do curso',
    description:
      'Moderador do curso ou admin. O slug vem do título. Capa (POST_COVER) e galeria (POST_IMAGE) são arquivos do curso enviados antes.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJsonBody('PostInput')
  @ApiJson(201, 'Post criado', POST)
  @ApiProblems(400, 401, 403, 404, 409)
  async create(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Body(postBody) input: ParsedPostInput,
  ) {
    return this.save.create(await this.actor(userId), course, input)
  }

  @Post('hub/posts')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Criar post institucional',
    description:
      'Só admin. Aparece no hub de todos os cursos; capa e galeria são enviadas sem curso.',
  })
  @ApiJsonBody('PostInput')
  @ApiJson(201, 'Post criado', POST)
  @ApiProblems(400, 401, 403, 409)
  async createInstitutional(
    @CurrentUserId() userId: string,
    @Body(postBody) input: ParsedPostInput,
  ) {
    return this.save.create(await this.actor(userId), null, input)
  }

  @Put('hub/posts/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Editar post',
    description:
      'Substitui o post inteiro; o slug fica. Publicar marca a data na primeira vez. Capa e imagens que saem são soltas.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('PostInput')
  @ApiJson(200, 'Post salvo', POST)
  @ApiProblems(400, 401, 403, 404, 409)
  async update(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(postBody) input: ParsedPostInput,
  ) {
    return this.save.update(await this.actor(userId), id, input)
  }

  @Delete('hub/posts/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir post' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(204, 'Post excluído')
  @ApiProblems(400, 401, 403, 404)
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    await this.save.remove(await this.actor(userId), id)
  }

  @Get('me/hub-reads/:course')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Novidades do hub',
    description:
      'Posts publicados desde a última visita; sem visita, os dos últimos 7 dias.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJson(200, 'Contagem', schemaRef('HubUnread'))
  @ApiProblems(400, 401, 404)
  unread(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
  ) {
    return this.reads.unread(userId, course)
  }

  @Put('me/hub-reads/:course')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Marcar o hub como visto' })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJson(204, 'Visita registrada')
  @ApiProblems(400, 401, 404)
  async markRead(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
  ) {
    await this.reads.markRead(userId, course)
  }
}
