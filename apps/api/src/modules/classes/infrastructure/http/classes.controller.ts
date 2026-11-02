import {
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { slugSchema, termSchema } from '@ufc-flow/contracts'

import {
  ApiJson,
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
  CollectSectionsUseCase,
  GetCurrentTermUseCase,
  ListCourseSectionsUseCase,
  ListTermsUseCase,
} from '../../application/classes.use-cases'

// Leitura pública, sem login, com cache curto: a coleta roda a cada 6 horas
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=600'

const termParam = new ZodValidationPipe(termSchema)
const slugParam = new ZodValidationPipe(slugSchema)

@ApiTags('classes')
@Controller('v1/terms')
export class ClassesController {
  constructor(
    @Inject(ListTermsUseCase) private readonly listTerms: ListTermsUseCase,
    @Inject(GetCurrentTermUseCase)
    private readonly currentTerm: GetCurrentTermUseCase,
    @Inject(ListCourseSectionsUseCase)
    private readonly listSections: ListCourseSectionsUseCase,
    @Inject(CollectSectionsUseCase)
    private readonly collect: CollectSectionsUseCase,
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
  ) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Semestres letivos, do mais recente ao mais antigo',
  })
  @ApiJson(200, 'Semestres', arrayOf('AcademicTerm'))
  terms() {
    return this.listTerms.execute()
  }

  @Get('current')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Semestre letivo vigente',
    description: 'O que o web usa para turmas e agendas.',
  })
  @ApiJson(200, 'Semestre vigente', schemaRef('AcademicTerm'))
  @ApiProblems(404)
  current() {
    return this.currentTerm.execute()
  }

  @Get(':term/courses/:courseSlug/sections')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Turmas ofertadas a um curso no semestre',
    description:
      'Agrupadas por disciplina. Os ids são estáveis entre coletas (chave natural semestre, disciplina e turma). Turmas removidas do SIGAA não aparecem.',
  })
  @ApiParam({ name: 'term', example: '2026.2' })
  @ApiParam({ name: 'courseSlug', example: 'engenharia-de-computacao' })
  @ApiJson(200, 'Turmas do curso', schemaRef('CourseSections'))
  @ApiProblems(400, 404)
  sections(
    @Param('term', termParam) term: string,
    @Param('courseSlug', slugParam) courseSlug: string,
  ) {
    return this.listSections.execute(term, courseSlug)
  }

  @Post(':term/courses/:courseSlug/collect')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Coletar agora as turmas do curso (moderador do curso ou admin)',
    description:
      'Lê a página pública de turmas do SIGAA. Falha do SIGAA não é erro da rota: a execução volta com status FAILED e a mensagem.',
  })
  @ApiParam({ name: 'term', example: '2026.2' })
  @ApiParam({ name: 'courseSlug', example: 'engenharia-de-computacao' })
  @ApiJson(200, 'Execução da coleta', schemaRef('ScrapeRun'))
  @ApiProblems(400, 401, 403, 404)
  async collectNow(
    @CurrentUserId() userId: string,
    @Param('term', termParam) term: string,
    @Param('courseSlug', slugParam) courseSlug: string,
  ) {
    return this.collect.execute(
      await this.loadActor.execute(userId),
      term,
      courseSlug,
      'MANUAL',
    )
  }
}
