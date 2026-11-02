import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import {
  academicTermInputSchema,
  termSchema,
  updateAcademicTermInputSchema,
  type AcademicTermInput,
  type UpdateAcademicTermInput,
} from '@ufc-flow/contracts'

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
  CreateTermUseCase,
  DeleteTermUseCase,
  MarkCurrentTermUseCase,
  UpdateTermUseCase,
} from '../../application/classes.use-cases'

const termParam = new ZodValidationPipe(termSchema)

// Semestres letivos: só admin
@ApiTags('classes')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/admin/terms')
export class AdminTermsController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(CreateTermUseCase) private readonly createTerm: CreateTermUseCase,
    @Inject(UpdateTermUseCase) private readonly updateTerm: UpdateTermUseCase,
    @Inject(MarkCurrentTermUseCase)
    private readonly markCurrent: MarkCurrentTermUseCase,
    @Inject(DeleteTermUseCase) private readonly deleteTerm: DeleteTermUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar semestre letivo (admin)' })
  @ApiJsonBody('AcademicTermInput')
  @ApiJson(201, 'Semestre cadastrado', schemaRef('AcademicTerm'))
  @ApiProblems(400, 401, 403, 409)
  async create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(academicTermInputSchema))
    input: AcademicTermInput,
  ) {
    return this.createTerm.execute(await this.loadActor.execute(userId), input)
  }

  @Patch(':term')
  @ApiOperation({ summary: 'Ajustar as datas do semestre (admin)' })
  @ApiParam({ name: 'term', example: '2026.2' })
  @ApiJsonBody('UpdateAcademicTermInput')
  @ApiJson(200, 'Semestre atualizado', schemaRef('AcademicTerm'))
  @ApiProblems(400, 401, 403, 404)
  async update(
    @CurrentUserId() userId: string,
    @Param('term', termParam) term: string,
    @Body(new ZodValidationPipe(updateAcademicTermInputSchema))
    input: UpdateAcademicTermInput,
  ) {
    return this.updateTerm.execute(
      await this.loadActor.execute(userId),
      term,
      input,
    )
  }

  @Post(':term/make-current')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Marcar como semestre vigente (admin)',
    description: 'O vigente anterior é desmarcado na mesma transação.',
  })
  @ApiParam({ name: 'term', example: '2026.2' })
  @ApiJson(200, 'Semestre vigente', schemaRef('AcademicTerm'))
  @ApiProblems(400, 401, 403, 404)
  async makeCurrent(
    @CurrentUserId() userId: string,
    @Param('term', termParam) term: string,
  ) {
    return this.markCurrent.execute(await this.loadActor.execute(userId), term)
  }

  @Delete(':term')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Excluir semestre letivo (admin)',
    description: 'Só sem turmas coletadas.',
  })
  @ApiParam({ name: 'term', example: '2027.1' })
  @ApiJson(204, 'Semestre excluído')
  @ApiProblems(400, 401, 403, 404, 409)
  async remove(
    @CurrentUserId() userId: string,
    @Param('term', termParam) term: string,
  ) {
    await this.deleteTerm.execute(await this.loadActor.execute(userId), term)
  }
}
