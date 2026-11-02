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
  addCurriculumSubjectInputSchema,
  branchInputSchema,
  branchSubjectsInputSchema,
  createCurriculumInputSchema,
  curriculumSubjectInputSchema,
  subjectCodeSchema,
  updateCurriculumInputSchema,
  uuidSchema,
  type AddCurriculumSubjectInput,
  type BranchInput,
  type BranchSubjectsInput,
  type CreateCurriculumInput,
  type CurriculumSubjectInput,
  type UpdateCurriculumInput,
} from '@ufc-flow/contracts'

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
import { ListManagedCoursesUseCase } from '../../application/courses.use-cases'
import {
  AddCurriculumSubjectUseCase,
  CreateBranchUseCase,
  CreateCurriculumUseCase,
  DeleteCurriculumUseCase,
  ExportCurriculumUseCase,
  GetManagedCurriculumUseCase,
  MarkCurrentCurriculumUseCase,
  PublishCurriculumUseCase,
  RemoveBranchUseCase,
  RemoveCurriculumSubjectUseCase,
  SetBranchSubjectsUseCase,
  UpdateBranchUseCase,
  UpdateCurriculumSubjectUseCase,
  UpdateCurriculumUseCase,
} from '../../application/curriculum-editing.use-cases'

const idParam = new ZodValidationPipe(uuidSchema)
const codeParam = new ZodValidationPipe(subjectCodeSchema)
const MANAGED = schemaRef('ManagedCurriculum')
const EDIT_PROBLEMS = [400, 401, 403, 404, 409] as const

// Área de gestão de estruturas: moderador do curso ou admin. Responde a EC
// inteira depois de cada mudança, com os pontos para revisar e a checagem.
@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/manage')
export class ManageCurriculaController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(ListManagedCoursesUseCase)
    private readonly managedCourses: ListManagedCoursesUseCase,
    @Inject(GetManagedCurriculumUseCase)
    private readonly getCurriculum: GetManagedCurriculumUseCase,
    @Inject(CreateCurriculumUseCase)
    private readonly createCurriculum: CreateCurriculumUseCase,
    @Inject(UpdateCurriculumUseCase)
    private readonly updateCurriculum: UpdateCurriculumUseCase,
    @Inject(DeleteCurriculumUseCase)
    private readonly deleteCurriculum: DeleteCurriculumUseCase,
    @Inject(AddCurriculumSubjectUseCase)
    private readonly addSubject: AddCurriculumSubjectUseCase,
    @Inject(UpdateCurriculumSubjectUseCase)
    private readonly updateSubject: UpdateCurriculumSubjectUseCase,
    @Inject(RemoveCurriculumSubjectUseCase)
    private readonly removeSubject: RemoveCurriculumSubjectUseCase,
    @Inject(CreateBranchUseCase)
    private readonly createBranch: CreateBranchUseCase,
    @Inject(UpdateBranchUseCase)
    private readonly updateBranch: UpdateBranchUseCase,
    @Inject(RemoveBranchUseCase)
    private readonly removeBranch: RemoveBranchUseCase,
    @Inject(SetBranchSubjectsUseCase)
    private readonly setBranchSubjects: SetBranchSubjectsUseCase,
    @Inject(PublishCurriculumUseCase)
    private readonly publish: PublishCurriculumUseCase,
    @Inject(MarkCurrentCurriculumUseCase)
    private readonly markCurrent: MarkCurrentCurriculumUseCase,
    @Inject(ExportCurriculumUseCase)
    private readonly exportCurriculum: ExportCurriculumUseCase,
  ) {}

  private actor(userId: string): Promise<Actor> {
    return this.loadActor.execute(userId)
  }

  @Get('courses')
  @ApiOperation({
    summary: 'Cursos que gerencio',
    description: 'Admin vê todos. Inclui as estruturas em rascunho.',
  })
  @ApiJson(200, 'Cursos', arrayOf('CourseDetail'))
  @ApiProblems(401, 403)
  async courses(@CurrentUserId() userId: string) {
    return this.managedCourses.execute(await this.actor(userId))
  }

  @Post('courses/:courseId/curricula')
  @ApiOperation({
    summary: 'Criar estrutura à mão',
    description:
      'Nasce rascunho e vazia; a importação pela extensão é o caminho comum.',
  })
  @ApiParam({ name: 'courseId', format: 'uuid' })
  @ApiJsonBody('CreateCurriculumInput')
  @ApiJson(201, 'Estrutura criada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async create(
    @CurrentUserId() userId: string,
    @Param('courseId', idParam) courseId: string,
    @Body(new ZodValidationPipe(createCurriculumInputSchema))
    input: CreateCurriculumInput,
  ) {
    return this.createCurriculum.execute(
      await this.actor(userId),
      courseId,
      input,
    )
  }

  @Get('curricula/:id')
  @ApiOperation({ summary: 'Estrutura na área de gestão' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Estrutura', MANAGED)
  @ApiProblems(400, 401, 403, 404)
  async get(@CurrentUserId() userId: string, @Param('id', idParam) id: string) {
    return this.getCurriculum.execute(await this.actor(userId), id)
  }

  @Patch('curricula/:id')
  @ApiOperation({
    summary: 'Editar o cabeçalho da estrutura',
    description:
      'Depois da primeira matrícula, código, vigor, endereço e cargas exigidas travam.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('UpdateCurriculumInput')
  @ApiJson(200, 'Estrutura atualizada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async update(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(updateCurriculumInputSchema))
    input: UpdateCurriculumInput,
  ) {
    return this.updateCurriculum.execute(await this.actor(userId), id, input)
  }

  @Delete('curricula/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Descartar rascunho' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(204, 'Rascunho descartado')
  @ApiProblems(...EDIT_PROBLEMS)
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    await this.deleteCurriculum.execute(await this.actor(userId), id)
  }

  @Post('curricula/:id/subjects')
  @ApiOperation({
    summary: 'Adicionar disciplina à estrutura',
    description:
      'Se o código ainda não existe no catálogo, informe os dados da disciplina em `subject`.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('AddCurriculumSubjectInput')
  @ApiJson(201, 'Estrutura atualizada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async add(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(addCurriculumSubjectInputSchema))
    input: AddCurriculumSubjectInput,
  ) {
    return this.addSubject.execute(await this.actor(userId), id, input)
  }

  @Put('curricula/:id/subjects/:code')
  @ApiOperation({
    summary: 'Editar disciplina na estrutura',
    description:
      'Semestre, natureza, pré e co-requisitos e vertentes (painel lateral do editor).',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'code', example: 'ECO0083' })
  @ApiJsonBody('CurriculumSubjectInput')
  @ApiJson(200, 'Estrutura atualizada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async editSubject(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Param('code', codeParam) code: string,
    @Body(new ZodValidationPipe(curriculumSubjectInputSchema))
    input: CurriculumSubjectInput,
  ) {
    return this.updateSubject.execute(await this.actor(userId), id, code, input)
  }

  @Delete('curricula/:id/subjects/:code')
  @ApiOperation({ summary: 'Tirar disciplina da estrutura' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'code', example: 'ECO0083' })
  @ApiJson(200, 'Estrutura atualizada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async removeFromCurriculum(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Param('code', codeParam) code: string,
  ) {
    return this.removeSubject.execute(await this.actor(userId), id, code)
  }

  @Post('curricula/:id/branches')
  @ApiOperation({ summary: 'Criar vertente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('BranchInput')
  @ApiJson(201, 'Estrutura atualizada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async addBranch(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(branchInputSchema)) input: BranchInput,
  ) {
    return this.createBranch.execute(await this.actor(userId), id, input)
  }

  @Put('curricula/:id/branches/:branchId')
  @ApiOperation({
    summary: 'Editar vertente',
    description:
      'Nome, descrição e cor são livres; tipo, vertente-mãe e mínimos travam depois da primeira matrícula.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'branchId', format: 'uuid' })
  @ApiJsonBody('BranchInput')
  @ApiJson(200, 'Estrutura atualizada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async editBranch(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Param('branchId', idParam) branchId: string,
    @Body(new ZodValidationPipe(branchInputSchema)) input: BranchInput,
  ) {
    return this.updateBranch.execute(
      await this.actor(userId),
      id,
      branchId,
      input,
    )
  }

  @Delete('curricula/:id/branches/:branchId')
  @ApiOperation({ summary: 'Remover vertente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'branchId', format: 'uuid' })
  @ApiJson(200, 'Estrutura atualizada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async deleteBranch(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Param('branchId', idParam) branchId: string,
  ) {
    return this.removeBranch.execute(await this.actor(userId), id, branchId)
  }

  @Put('curricula/:id/branches/:branchId/subjects')
  @ApiOperation({
    summary: 'Vincular disciplinas à vertente em lote',
    description:
      'A lista enviada passa a ser exatamente as disciplinas da vertente.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'branchId', format: 'uuid' })
  @ApiJsonBody('BranchSubjectsInput')
  @ApiJson(200, 'Estrutura atualizada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async linkBranch(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Param('branchId', idParam) branchId: string,
    @Body(new ZodValidationPipe(branchSubjectsInputSchema))
    input: BranchSubjectsInput,
  ) {
    return this.setBranchSubjects.execute(
      await this.actor(userId),
      id,
      branchId,
      input,
    )
  }

  @Post('curricula/:id/publish')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Publicar estrutura',
    description:
      'Roda a checagem de publicação: natureza, vertentes, ciclos de pré-requisito e pontos para revisar. Erro barra.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Estrutura publicada', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async publishCurriculum(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.publish.execute(await this.actor(userId), id)
  }

  @Post('curricula/:id/make-current')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Marcar como estrutura vigente',
    description: 'Desmarca a vigente anterior do curso na mesma transação.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Estrutura vigente', MANAGED)
  @ApiProblems(...EDIT_PROBLEMS)
  async makeCurrent(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.markCurrent.execute(await this.actor(userId), id)
  }

  @Get('curricula/:id/export')
  @ApiOperation({
    summary: 'Exportar estrutura em JSON',
    description: 'No formato CurriculumImportV1, o mesmo da importação.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Arquivo de importação', schemaRef('CurriculumImportV1'))
  @ApiProblems(400, 401, 403, 404)
  async export(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.exportCurriculum.execute(await this.actor(userId), id)
  }
}
