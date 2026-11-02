import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import {
  activityRecordInputSchema,
  changeCurriculumInputSchema,
  closeSubjectRecordInputSchema,
  enrollmentInputSchema,
  subjectRecordInputSchema,
  uuidSchema,
  type ActivityRecordInput,
  type ChangeCurriculumInput,
  type CloseSubjectRecordInput,
  type EnrollmentInput,
  type SubjectRecordInput,
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
  AuthGuard,
  CurrentUserId,
} from '../../../identity/infrastructure/http/auth.guard'
import {
  CreateActivityUseCase,
  DeleteActivityUseCase,
  ListActivitiesUseCase,
  UpdateActivityUseCase,
} from '../../application/activities.use-cases'
import {
  ChangeCurriculumUseCase,
  CreateEnrollmentUseCase,
  ListEnrollmentsUseCase,
} from '../../application/enrollments.use-cases'
import {
  AddRecordUseCase,
  CloseRecordUseCase,
  DeleteRecordUseCase,
  ListRecordsUseCase,
} from '../../application/records.use-cases'
import { GetAcademicSummaryUseCase } from '../../application/summary.use-case'

const idParam = new ZodValidationPipe(uuidSchema)

// Vida acadêmica de quem está logado. Só o próprio aluno lê e altera: a
// matrícula, o registro ou a atividade de outra pessoa respondem 404.
@ApiTags('academic-record')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/me')
export class AcademicRecordController {
  constructor(
    @Inject(ListEnrollmentsUseCase)
    private readonly listEnrollments: ListEnrollmentsUseCase,
    @Inject(CreateEnrollmentUseCase)
    private readonly createEnrollment: CreateEnrollmentUseCase,
    @Inject(ChangeCurriculumUseCase)
    private readonly changeCurriculum: ChangeCurriculumUseCase,
    @Inject(GetAcademicSummaryUseCase)
    private readonly getSummary: GetAcademicSummaryUseCase,
    @Inject(ListRecordsUseCase)
    private readonly listRecords: ListRecordsUseCase,
    @Inject(AddRecordUseCase) private readonly addRecord: AddRecordUseCase,
    @Inject(CloseRecordUseCase)
    private readonly closeRecord: CloseRecordUseCase,
    @Inject(DeleteRecordUseCase)
    private readonly deleteRecord: DeleteRecordUseCase,
    @Inject(ListActivitiesUseCase)
    private readonly listActivities: ListActivitiesUseCase,
    @Inject(CreateActivityUseCase)
    private readonly createActivity: CreateActivityUseCase,
    @Inject(UpdateActivityUseCase)
    private readonly updateActivity: UpdateActivityUseCase,
    @Inject(DeleteActivityUseCase)
    private readonly deleteActivity: DeleteActivityUseCase,
  ) {}

  // ——— Matrículas ———

  @Get('enrollments')
  @ApiOperation({
    summary: 'Minhas matrículas',
    description: 'A atual primeiro, depois as antigas (transferidas).',
  })
  @ApiJson(200, 'Matrículas', arrayOf('Enrollment'))
  @ApiProblems(401)
  enrollments(@CurrentUserId() userId: string) {
    return this.listEnrollments.execute(userId)
  }

  @Post('enrollments')
  @ApiOperation({
    summary: 'Criar matrícula',
    description:
      'Num curso ativo, numa EC publicada. Com a matrícula atual em outro curso, é transferência interna: a antiga vira TRANSFERRED e a nova passa a ser a atual. No mesmo curso, use a migração de EC.',
  })
  @ApiJsonBody('EnrollmentInput')
  @ApiJson(201, 'Matrícula criada', schemaRef('Enrollment'))
  @ApiProblems(400, 401, 404, 409)
  enroll(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(enrollmentInputSchema)) input: EnrollmentInput,
  ) {
    return this.createEnrollment.execute(userId, input)
  }

  @Patch('enrollments/:id/curriculum')
  @ApiOperation({
    summary: 'Migrar de estrutura curricular',
    description:
      'Só na matrícula atual, para outra EC publicada do mesmo curso. Os registros ficam e o progresso é recalculado; a troca vai para a auditoria.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('ChangeCurriculumInput')
  @ApiJson(200, 'Matrícula na nova EC', schemaRef('Enrollment'))
  @ApiProblems(400, 401, 404, 409)
  migrate(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(changeCurriculumInputSchema))
    input: ChangeCurriculumInput,
  ) {
    return this.changeCurriculum.execute(userId, id, input)
  }

  @Get('enrollments/:id/summary')
  @ApiOperation({
    summary: 'Resumo da Minha área',
    description:
      'Progresso de integralização por categoria e vertente, disciplinas em CURSANDO, CURSANDO de semestres passados, liberadas para cursar e o aviso de fechar situação.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Resumo', schemaRef('AcademicSummary'))
  @ApiProblems(400, 401, 404)
  summary(@CurrentUserId() userId: string, @Param('id', idParam) id: string) {
    return this.getSummary.execute(userId, id)
  }

  // ——— Histórico ———

  @Get('enrollments/:id/records')
  @ApiOperation({
    summary: 'Histórico da matrícula',
    description: 'Por semestre.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Registros', arrayOf('SubjectRecord'))
  @ApiProblems(400, 401, 404)
  records(@CurrentUserId() userId: string, @Param('id', idParam) id: string) {
    return this.listRecords.execute(userId, id)
  }

  @Post('enrollments/:id/records')
  @ApiOperation({
    summary: 'Lançar disciplina no histórico',
    description:
      'Uma tentativa por disciplina e semestre. CURSANDO só no semestre vigente; o histórico passado vai direto com a situação final. Nova tentativa só depois de REPROVADO, TRANCADA ou SUPRIMIDA, em semestre posterior. Disciplina fora da EC conta como optativa livre.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('SubjectRecordInput')
  @ApiJson(201, 'Registro lançado', schemaRef('SubjectRecord'))
  @ApiProblems(400, 401, 404, 409)
  add(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(subjectRecordInputSchema))
    input: SubjectRecordInput,
  ) {
    return this.addRecord.execute(userId, id, input)
  }

  @Patch('records/:id')
  @ApiOperation({
    summary: 'Fechar a situação',
    description:
      'Só CURSANDO muda: para APROVADO, REPROVADO, TRANCADA ou SUPRIMIDA. Nota só em APROVADO e REPROVADO.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('CloseSubjectRecordInput')
  @ApiJson(200, 'Registro fechado', schemaRef('SubjectRecord'))
  @ApiProblems(400, 401, 404, 409)
  close(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(closeSubjectRecordInputSchema))
    input: CloseSubjectRecordInput,
  ) {
    return this.closeRecord.execute(userId, id, input)
  }

  @Delete('records/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir registro do histórico' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(204, 'Registro excluído')
  @ApiProblems(400, 401, 404)
  async removeRecord(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    await this.deleteRecord.execute(userId, id)
  }

  // ——— Atividades ———

  @Get('enrollments/:id/activities')
  @ApiOperation({
    summary: 'Atividades complementares e de extensão',
    description: 'Da mais recente para a mais antiga.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Atividades', arrayOf('ActivityRecord'))
  @ApiProblems(400, 401, 404)
  activities(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.listActivities.execute(userId, id)
  }

  @Post('enrollments/:id/activities')
  @ApiOperation({
    summary: 'Lançar atividade',
    description:
      'Horas declaradas pelo aluno. A categoria, opcional, é da EC da matrícula e do mesmo tipo. O certificado é um arquivo CERTIFICATE enviado antes em POST /v1/files.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('ActivityRecordInput')
  @ApiJson(201, 'Atividade lançada', schemaRef('ActivityRecord'))
  @ApiProblems(400, 401, 404, 409)
  addActivity(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(activityRecordInputSchema))
    input: ActivityRecordInput,
  ) {
    return this.createActivity.execute(userId, id, input)
  }

  @Put('activities/:id')
  @ApiOperation({
    summary: 'Alterar atividade',
    description:
      'Substitui a atividade inteira. Trocar ou tirar o certificado solta o anterior, que é apagado depois.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('ActivityRecordInput')
  @ApiJson(200, 'Atividade alterada', schemaRef('ActivityRecord'))
  @ApiProblems(400, 401, 404, 409)
  putActivity(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(activityRecordInputSchema))
    input: ActivityRecordInput,
  ) {
    return this.updateActivity.execute(userId, id, input)
  }

  @Delete('activities/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir atividade' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(204, 'Atividade excluída')
  @ApiProblems(400, 401, 404)
  async removeActivity(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    await this.deleteActivity.execute(userId, id)
  }
}
