import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import {
  evaluationCriteriaOrderSchema,
  evaluationCriterionInputSchema,
  evaluationInputSchema,
  subjectCodeSchema,
  uuidSchema,
  type EvaluationCriteriaOrder,
  type EvaluationInput,
  type ParsedEvaluationCriterionInput,
} from '@ufc-flow/contracts'

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
  EvaluationCriteriaUseCase,
  SubjectEvaluationsUseCase,
} from '../../application/evaluation.use-cases'

const codeParam = new ZodValidationPipe(subjectCodeSchema)
const idParam = new ZodValidationPipe(uuidSchema)
const criterionBody = new ZodValidationPipe(evaluationCriterionInputSchema)
const CODE = { name: 'code', example: 'ECO0005' }
const MINE = schemaRef('MyEvaluation')
const CRITERION = schemaRef('EvaluationCriterion')

// Avaliação de disciplinas: resumo público, só a partir de 5 respostas; a
// própria avaliação, para quem cursou; critérios, para admin
@ApiTags('evaluation')
@Controller('v1')
export class EvaluationController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(SubjectEvaluationsUseCase)
    private readonly evaluations: SubjectEvaluationsUseCase,
    @Inject(EvaluationCriteriaUseCase)
    private readonly criteria: EvaluationCriteriaUseCase,
  ) {}

  @Get('subjects/:code/evaluations')
  @ApiOperation({
    summary: 'Avaliações da disciplina',
    description:
      'Médias, contagem e distribuição de 1 a 5 por critério, só com 5 ou mais avaliações; abaixo disso, só os critérios. Nunca diz quem avaliou. A avaliação é da disciplina, de todos os cursos.',
  })
  @ApiParam(CODE)
  @ApiJson(200, 'Resumo', schemaRef('SubjectEvaluationSummary'))
  @ApiProblems(400, 404)
  summary(@Param('code', codeParam) code: string) {
    return this.evaluations.summary(code)
  }

  @Get('me/evaluations/:code')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Minha avaliação da disciplina',
    description:
      'Se a pessoa pode avaliar (APROVADO ou REPROVADO no histórico) e as notas que deu.',
  })
  @ApiParam(CODE)
  @ApiJson(200, 'Minha avaliação', MINE)
  @ApiProblems(400, 401, 404)
  mine(
    @CurrentUserId() userId: string,
    @Param('code', codeParam) code: string,
  ) {
    return this.evaluations.mine(userId, code)
  }

  @Put('me/evaluations/:code')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Avaliar a disciplina',
    description:
      'Uma nota de 1 a 5 para cada critério ativo. Uma avaliação por pessoa e disciplina; enviar de novo edita.',
  })
  @ApiParam(CODE)
  @ApiJsonBody('EvaluationInput')
  @ApiJson(200, 'Avaliação salva', MINE)
  @ApiProblems(400, 401, 403, 404)
  async save(
    @CurrentUserId() userId: string,
    @Param('code', codeParam) code: string,
    @Body(new ZodValidationPipe(evaluationInputSchema)) input: EvaluationInput,
  ) {
    return this.evaluations.save(
      await this.loadActor.execute(userId),
      code,
      input,
    )
  }

  @Get('admin/evaluation-criteria')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Critérios de avaliação',
    description: 'Todos, inclusive os desativados, na ordem. Só admin.',
  })
  @ApiJson(200, 'Critérios', arrayOf('EvaluationCriterion'))
  @ApiProblems(401, 403)
  async list(@CurrentUserId() userId: string) {
    return this.criteria.list(await this.loadActor.execute(userId))
  }

  @Post('admin/evaluation-criteria')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar critério', description: 'Vai para o fim.' })
  @ApiJsonBody('EvaluationCriterionInput')
  @ApiJson(201, 'Critério criado', CRITERION)
  @ApiProblems(400, 401, 403, 409)
  async create(
    @CurrentUserId() userId: string,
    @Body(criterionBody) input: ParsedEvaluationCriterionInput,
  ) {
    return this.criteria.save(await this.loadActor.execute(userId), null, input)
  }

  @Put('admin/evaluation-criteria/order')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ordenar critérios',
    description: 'Todos os critérios, uma vez cada.',
  })
  @ApiJsonBody('EvaluationCriteriaOrder')
  @ApiJson(200, 'Critérios na nova ordem', arrayOf('EvaluationCriterion'))
  @ApiProblems(400, 401, 403)
  async reorder(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(evaluationCriteriaOrderSchema))
    input: EvaluationCriteriaOrder,
  ) {
    return this.criteria.reorder(await this.loadActor.execute(userId), input)
  }

  @Put('admin/evaluation-criteria/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Editar critério',
    description:
      'Desativar tira o critério do resumo e do formulário; as notas dadas ficam guardadas. Critérios não são apagados.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('EvaluationCriterionInput')
  @ApiJson(200, 'Critério salvo', CRITERION)
  @ApiProblems(400, 401, 403, 404, 409)
  async update(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(criterionBody) input: ParsedEvaluationCriterionInput,
  ) {
    return this.criteria.save(await this.loadActor.execute(userId), id, input)
  }
}
