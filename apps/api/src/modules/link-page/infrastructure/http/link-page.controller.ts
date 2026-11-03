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
  Res,
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
  linkInputSchema,
  linkOrderInputSchema,
  linkPageSettingsInputSchema,
  linkSectionInputSchema,
  linkSourceQuerySchema,
  linkStatsQuerySchema,
  linkViewInputSchema,
  slugSchema,
  socialLinkInputSchema,
  uuidSchema,
  type LinkTrafficSource,
  type ParsedLinkInput,
  type ParsedLinkOrder,
  type ParsedLinkPageSettings,
  type ParsedLinkSection,
  type SocialLinkInput,
} from '@ufc-flow/contracts'
import type { Response } from 'express'

import type { Actor } from '../../../../shared/domain/access-policy'
import {
  ApiJson,
  ApiJsonBody,
  ApiProblems,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
import { LoadActorUseCase } from '../../../identity/application/load-actor.use-case'
import {
  AuthGuard,
  CurrentUserId,
} from '../../../identity/infrastructure/http/auth.guard'
import {
  ManageLinkPageUseCase,
  PublicLinkPageUseCase,
} from '../../application/link-page.use-cases'

const idParam = new ZodValidationPipe(uuidSchema)
const slugParam = new ZodValidationPipe(slugSchema)
const MANAGED = schemaRef('ManagedLinkPage')
const EDIT_PROBLEMS = [400, 401, 403, 404] as const

// Leitura pública com cache curto (60 s), como pede a modelagem
const PUBLIC_CACHE = 'public, max-age=60'

// Editor da página de links do curso: moderador do curso ou admin. Cada
// mudança devolve a página inteira, como o editor mostra.
@ApiTags('link-page')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/courses/:course/link-page')
export class ManageLinkPageController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(ManageLinkPageUseCase)
    private readonly manage: ManageLinkPageUseCase,
  ) {}

  private actor(userId: string): Promise<Actor> {
    return this.loadActor.execute(userId)
  }

  @Get()
  @ApiOperation({
    summary: 'Página de links no editor',
    description:
      'Com seções, links (inclusive ocultos, programados e expirados, com os cliques de 7 dias) e redes. Na primeira vez, a página nasce com o slug do curso e despublicada.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJson(200, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async get(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
  ) {
    return this.manage.get(await this.actor(userId), course)
  }

  @Put()
  @ApiOperation({
    summary: 'Salvar aparência e publicação',
    description:
      'Slug, bio, foto ou ícone, capa, tema, botões, fonte e publicação. Trocar o slug quebra QR codes já impressos.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJsonBody('LinkPageSettingsInput')
  @ApiJson(200, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS, 409)
  async settings(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Body(new ZodValidationPipe(linkPageSettingsInputSchema))
    input: ParsedLinkPageSettings,
  ) {
    return this.manage.updateSettings(await this.actor(userId), course, input)
  }

  @Post('sections')
  @ApiOperation({ summary: 'Criar seção' })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJsonBody('LinkSectionInput')
  @ApiJson(201, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async createSection(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Body(new ZodValidationPipe(linkSectionInputSchema))
    input: ParsedLinkSection,
  ) {
    return this.manage.saveSection(
      await this.actor(userId),
      course,
      null,
      input,
    )
  }

  @Put('sections/:id')
  @ApiOperation({ summary: 'Editar seção' })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('LinkSectionInput')
  @ApiJson(200, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async updateSection(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(linkSectionInputSchema))
    input: ParsedLinkSection,
  ) {
    return this.manage.saveSection(await this.actor(userId), course, id, input)
  }

  @Delete('sections/:id')
  @ApiOperation({
    summary: 'Remover seção',
    description: 'Os links dela ficam, sem seção (no topo).',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async removeSection(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Param('id', idParam) id: string,
  ) {
    return this.manage.removeSection(await this.actor(userId), course, id)
  }

  @Post('links')
  @ApiOperation({
    summary: 'Criar link',
    description:
      'Endereço (URL), arquivo do curso (FILE, LINK_FILE), tela do Flow (INTERNAL) ou post do hub (POST). Marcar como destaque desmarca o anterior.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJsonBody('LinkInput')
  @ApiJson(201, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async createLink(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Body(new ZodValidationPipe(linkInputSchema)) input: ParsedLinkInput,
  ) {
    return this.manage.saveLink(await this.actor(userId), course, null, input)
  }

  @Put('links/:id')
  @ApiOperation({ summary: 'Editar link' })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('LinkInput')
  @ApiJson(200, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async updateLink(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(linkInputSchema)) input: ParsedLinkInput,
  ) {
    return this.manage.saveLink(await this.actor(userId), course, id, input)
  }

  @Delete('links/:id')
  @ApiOperation({ summary: 'Remover link' })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async removeLink(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Param('id', idParam) id: string,
  ) {
    return this.manage.removeLink(await this.actor(userId), course, id)
  }

  @Post('social-links')
  @ApiOperation({ summary: 'Criar rede social' })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJsonBody('SocialLinkInput')
  @ApiJson(201, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async createSocial(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Body(new ZodValidationPipe(socialLinkInputSchema)) input: SocialLinkInput,
  ) {
    return this.manage.saveSocialLink(
      await this.actor(userId),
      course,
      null,
      input,
    )
  }

  @Put('social-links/:id')
  @ApiOperation({ summary: 'Editar rede social' })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('SocialLinkInput')
  @ApiJson(200, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async updateSocial(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(socialLinkInputSchema)) input: SocialLinkInput,
  ) {
    return this.manage.saveSocialLink(
      await this.actor(userId),
      course,
      id,
      input,
    )
  }

  @Delete('social-links/:id')
  @ApiOperation({ summary: 'Remover rede social' })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async removeSocial(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Param('id', idParam) id: string,
  ) {
    return this.manage.removeSocialLink(await this.actor(userId), course, id)
  }

  @Put('order')
  @ApiOperation({
    summary: 'Salvar a ordem',
    description:
      'Depois de arrastar: todas as seções, os links com a seção de cada um e as redes, uma vez cada.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJsonBody('LinkOrderInput')
  @ApiJson(200, 'Página', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async order(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Body(new ZodValidationPipe(linkOrderInputSchema)) input: ParsedLinkOrder,
  ) {
    return this.manage.setOrder(await this.actor(userId), course, input)
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Estatísticas da página',
    description:
      'Visitas por dia e origem e cliques por link, em 7 ou 30 dias, sem dados de quem visitou.',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  @ApiJson(200, 'Estatísticas', schemaRef('LinkStats'))
  @ApiProblems(...EDIT_PROBLEMS)
  async stats(
    @CurrentUserId() userId: string,
    @Param('course', slugParam) course: string,
    @Query(new ZodValidationPipe(linkStatsQuerySchema))
    query: { days: number },
  ) {
    return this.manage.stats(await this.actor(userId), course, query.days)
  }
}

// Leituras públicas. A API fica atrás do web, que serve /l/{slug} (D85).
@ApiTags('link-page')
@Controller('v1')
export class PublicLinkPageController {
  constructor(
    @Inject(PublicLinkPageUseCase)
    private readonly open: PublicLinkPageUseCase,
  ) {}

  @Get('link-pages/:slug')
  @ApiOperation({
    summary: 'Página pública de links',
    description:
      'Só o que está publicado, visível e dentro do período. Página despublicada responde 404. Cache de 60 s.',
  })
  @ApiParam({ name: 'slug', example: 'engenharia-de-computacao' })
  @ApiJson(200, 'Página', schemaRef('PublicLinkPage'))
  @ApiProblems(400, 404)
  async page(
    @Param('slug', slugParam) slug: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const page = await this.open.page(slug)
    response.set('Cache-Control', PUBLIC_CACHE)
    return page
  }

  @Get('link-pages/:slug/go/:linkId')
  @ApiOperation({
    summary: 'Abrir um link da página',
    description:
      'Soma 1 clique no dia e na origem (src=page, qr ou hub) e redireciona (302) para o destino: endereço externo ou caminho do web.',
  })
  @ApiParam({ name: 'slug', example: 'engenharia-de-computacao' })
  @ApiParam({ name: 'linkId', format: 'uuid' })
  @ApiQuery({ name: 'src', required: false, example: 'qr' })
  @ApiJson(302, 'Redirecionamento para o destino')
  @ApiProblems(400, 404)
  async go(
    @Param('slug', slugParam) slug: string,
    @Param('linkId', idParam) linkId: string,
    @Query(new ZodValidationPipe(linkSourceQuerySchema))
    query: { src: LinkTrafficSource },
    @Res() response: Response,
  ) {
    const target = await this.open.click(slug, linkId, query.src)
    response
      .status(302)
      .set('Cache-Control', 'no-store')
      .set('Location', target)
      .end()
  }

  @Post('link-pages/:slug/views')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Contar uma visita',
    description: 'Soma 1 visita no dia e na origem, sem dados de quem visitou.',
  })
  @ApiParam({ name: 'slug', example: 'engenharia-de-computacao' })
  @ApiJsonBody('LinkViewInput')
  @ApiJson(204, 'Visita contada')
  @ApiProblems(400, 404)
  async view(
    @Param('slug', slugParam) slug: string,
    @Body(new ZodValidationPipe(linkViewInputSchema))
    input: { source: LinkTrafficSource },
  ) {
    await this.open.view(slug, input.source)
  }

  @Get('courses/:course/link-page/preview')
  @ApiOperation({
    summary: 'Links importantes do hub',
    description:
      'Os 5 primeiros links visíveis da página publicada, com o slug para o atalho "Ver página".',
  })
  @ApiParam({ name: 'course', example: 'engenharia-de-computacao' })
  @ApiJson(200, 'Prévia', schemaRef('LinkPagePreview'))
  @ApiProblems(400, 404)
  async preview(
    @Param('course', slugParam) course: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const preview = await this.open.preview(course)
    response.set('Cache-Control', PUBLIC_CACHE)
    return preview
  }
}
