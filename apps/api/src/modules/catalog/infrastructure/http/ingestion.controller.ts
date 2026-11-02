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
  curriculumImportCreateQuerySchema,
  curriculumImportListQuerySchema,
  curriculumImportSourceSchema,
  curriculumImportStatusSchema,
  curriculumImportV1Schema,
  resolveReviewPointInputSchema,
  uuidSchema,
  type CurriculumImportCreateQuery,
  type CurriculumImportListQuery,
  type CurriculumImportV1,
  type ResolveReviewPointInput,
} from '@ufc-flow/contracts'
import { z } from 'zod'

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
  ApplyImportUseCase,
  CreateImportUseCase,
  DiscardImportUseCase,
  GetImportUseCase,
  ListImportsUseCase,
  ResolveReviewPointUseCase,
} from '../../application/ingestion.use-cases'

const idParam = new ZodValidationPipe(uuidSchema)
const keyParam = new ZodValidationPipe(z.string().min(1).max(100))

// Recebe as estruturas extraídas do SIGAA pela extensão ou enviadas por
// upload na área administrativa, no formato CurriculumImportV1
@ApiTags('ingestion')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/ingestion/curriculum-imports')
export class IngestionController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(CreateImportUseCase)
    private readonly createImport: CreateImportUseCase,
    @Inject(ListImportsUseCase)
    private readonly listImports: ListImportsUseCase,
    @Inject(GetImportUseCase) private readonly getImport: GetImportUseCase,
    @Inject(ApplyImportUseCase)
    private readonly applyImport: ApplyImportUseCase,
    @Inject(DiscardImportUseCase)
    private readonly discardImport: DiscardImportUseCase,
    @Inject(ResolveReviewPointUseCase)
    private readonly resolve: ResolveReviewPointUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Enviar estrutura curricular',
    description:
      'Guarda o arquivo como veio. Com o curso no Flow e a estrutura nova, já cria o rascunho; reimportação espera o diff ser aplicado; curso inexistente deixa a importação pendente até um admin criá-lo.',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: curriculumImportSourceSchema.options,
  })
  @ApiJsonBody('CurriculumImportV1')
  @ApiJson(201, 'Importação recebida', schemaRef('CurriculumImport'))
  @ApiProblems(400, 401, 403)
  async create(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(curriculumImportCreateQuerySchema))
    query: CurriculumImportCreateQuery,
    @Body(new ZodValidationPipe(curriculumImportV1Schema))
    payload: CurriculumImportV1,
  ) {
    return this.createImport.execute(
      await this.loadActor.execute(userId),
      payload,
      query.source,
    )
  }

  @Get()
  @ApiOperation({
    summary: 'Importações',
    description:
      'Admin vê todas; os demais, as dos cursos que moderam e as que enviaram. Da mais nova à mais antiga.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: curriculumImportStatusSchema.options,
  })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiJson(200, 'Página de importações', schemaRef('CurriculumImportPage'))
  @ApiProblems(400, 401, 403)
  async list(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(curriculumImportListQuerySchema))
    query: CurriculumImportListQuery,
  ) {
    return this.listImports.execute(await this.loadActor.execute(userId), query)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe da importação',
    description:
      'Com as diferenças para a estrutura que já existe e os pontos para revisar.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Importação', schemaRef('CurriculumImportDetail'))
  @ApiProblems(400, 401, 403, 404)
  async get(@CurrentUserId() userId: string, @Param('id', idParam) id: string) {
    return this.getImport.execute(await this.loadActor.execute(userId), id)
  }

  @Post(':id/apply')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aplicar a reimportação',
    description:
      'Atualiza a estrutura existente pelas mesmas regras da edição manual.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Importação aplicada', schemaRef('CurriculumImportDetail'))
  @ApiProblems(400, 401, 403, 404, 409)
  async apply(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.applyImport.execute(await this.loadActor.execute(userId), id)
  }

  @Post(':id/discard')
  @HttpCode(200)
  @ApiOperation({ summary: 'Descartar importação pendente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Importação descartada', schemaRef('CurriculumImport'))
  @ApiProblems(400, 401, 403, 404, 409)
  async discard(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.discardImport.execute(await this.loadActor.execute(userId), id)
  }

  @Post(':id/review-points/:key/resolve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Resolver ponto para revisar',
    description:
      'Manter o catálogo, usar o que veio do SIGAA, dar ciência ou (admin) aplicar equivalências sugeridas.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'key', example: 'name:SBL0074' })
  @ApiJsonBody('ResolveReviewPointInput')
  @ApiJson(200, 'Estrutura atualizada', schemaRef('ManagedCurriculum'))
  @ApiProblems(400, 401, 403, 404, 409)
  async resolvePoint(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Param('key', keyParam) key: string,
    @Body(new ZodValidationPipe(resolveReviewPointInputSchema))
    input: ResolveReviewPointInput,
  ) {
    return this.resolve.execute(
      await this.loadActor.execute(userId),
      id,
      key,
      input.resolution,
    )
  }
}
