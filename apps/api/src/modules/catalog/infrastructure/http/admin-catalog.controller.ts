import {
  Body,
  Controller,
  Delete,
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
  createCourseInputSchema,
  subjectCodeSchema,
  subjectEquivalencesInputSchema,
  updateCourseInputSchema,
  updateSubjectInputSchema,
  uuidSchema,
  type CreateCourseInput,
  type SubjectEquivalencesInput,
  type UpdateCourseInput,
  type UpdateSubjectInput,
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
  CreateCourseUseCase,
  DeleteCourseUseCase,
  RefreshSigaaCoursesUseCase,
  UpdateCourseUseCase,
} from '../../application/courses.use-cases'
import {
  SetSubjectEquivalencesUseCase,
  UpdateSubjectUseCase,
} from '../../application/subjects.use-cases'

const idParam = new ZodValidationPipe(uuidSchema)
const codeParam = new ZodValidationPipe(subjectCodeSchema)

// Ações só de admin: cursos, catálogo do SIGAA e disciplinas globais
@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/admin')
export class AdminCatalogController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(RefreshSigaaCoursesUseCase)
    private readonly refreshSigaa: RefreshSigaaCoursesUseCase,
    @Inject(CreateCourseUseCase)
    private readonly createCourse: CreateCourseUseCase,
    @Inject(UpdateCourseUseCase)
    private readonly updateCourse: UpdateCourseUseCase,
    @Inject(DeleteCourseUseCase)
    private readonly deleteCourse: DeleteCourseUseCase,
    @Inject(UpdateSubjectUseCase)
    private readonly updateSubject: UpdateSubjectUseCase,
    @Inject(SetSubjectEquivalencesUseCase)
    private readonly setEquivalences: SetSubjectEquivalencesUseCase,
  ) {}

  @Post('sigaa-courses/refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Atualizar o catálogo do SIGAA (admin)',
    description:
      'Lê agora a lista pública de cursos do SIGAA; a tarefa agendada faz o mesmo toda semana.',
  })
  @ApiJson(200, 'Resumo da leitura', schemaRef('SigaaCourseRefresh'))
  @ApiProblems(401, 403)
  async refresh(@CurrentUserId() userId: string) {
    return this.refreshSigaa.execute(await this.loadActor.execute(userId))
  }

  @Post('courses')
  @ApiOperation({
    summary: 'Criar curso a partir do catálogo do SIGAA (admin)',
    description:
      'Importações que esperavam este curso viram rascunho na mesma operação.',
  })
  @ApiJsonBody('CreateCourseInput')
  @ApiJson(201, 'Curso criado', schemaRef('CourseDetail'))
  @ApiProblems(400, 401, 403, 404, 409)
  async create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createCourseInputSchema))
    input: CreateCourseInput,
  ) {
    return this.createCourse.execute(
      await this.loadActor.execute(userId),
      input,
    )
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Editar curso (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('UpdateCourseInput')
  @ApiJson(200, 'Curso atualizado', schemaRef('CourseDetail'))
  @ApiProblems(400, 401, 403, 404, 409)
  async update(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(updateCourseInputSchema))
    input: UpdateCourseInput,
  ) {
    return this.updateCourse.execute(
      await this.loadActor.execute(userId),
      id,
      input,
    )
  }

  @Delete('courses/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Excluir curso (admin)',
    description: 'Só sem estruturas publicadas; os rascunhos vão junto.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(204, 'Curso excluído')
  @ApiProblems(400, 401, 403, 404, 409)
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    await this.deleteCourse.execute(await this.loadActor.execute(userId), id)
  }

  @Patch('subjects/:code')
  @ApiOperation({
    summary: 'Editar disciplina global (admin)',
    description:
      'O nome é sempre livre; código, cargas e créditos travam quando alguma estrutura publicada usa a disciplina.',
  })
  @ApiParam({ name: 'code', example: 'SBL0084' })
  @ApiJsonBody('UpdateSubjectInput')
  @ApiJson(200, 'Disciplina atualizada', schemaRef('Subject'))
  @ApiProblems(400, 401, 403, 404, 409)
  async editSubject(
    @CurrentUserId() userId: string,
    @Param('code', codeParam) code: string,
    @Body(new ZodValidationPipe(updateSubjectInputSchema))
    input: UpdateSubjectInput,
  ) {
    return this.updateSubject.execute(
      await this.loadActor.execute(userId),
      code,
      input,
    )
  }

  @Put('subjects/:code/equivalences')
  @ApiOperation({
    summary: 'Trocar as equivalências de uma disciplina (admin)',
    description: 'Equivalências são globais e valem só na direção gravada.',
  })
  @ApiParam({ name: 'code', example: 'SBL0084' })
  @ApiJsonBody('SubjectEquivalencesInput')
  @ApiJson(200, 'Disciplina atualizada', schemaRef('Subject'))
  @ApiProblems(400, 401, 403, 404)
  async equivalences(
    @CurrentUserId() userId: string,
    @Param('code', codeParam) code: string,
    @Body(new ZodValidationPipe(subjectEquivalencesInputSchema))
    input: SubjectEquivalencesInput,
  ) {
    return this.setEquivalences.execute(
      await this.loadActor.execute(userId),
      code,
      input.equivalences,
    )
  }
}
