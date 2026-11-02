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
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import {
  activityCategoryInputSchema,
  uuidSchema,
  type ActivityCategoryInput,
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
  ListActivityCategoriesUseCase,
  SaveActivityCategoryUseCase,
} from '../../application/activities.use-cases'

const idParam = new ZodValidationPipe(uuidSchema)

// Categorias de atividades por EC, conforme o regulamento do curso: moderador
// do curso ou admin
@ApiTags('academic-record')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/manage')
export class ActivityCategoriesController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(ListActivityCategoriesUseCase)
    private readonly list: ListActivityCategoriesUseCase,
    @Inject(SaveActivityCategoryUseCase)
    private readonly save: SaveActivityCategoryUseCase,
  ) {}

  @Get('curricula/:curriculumId/activity-categories')
  @ApiOperation({ summary: 'Categorias de atividades da EC' })
  @ApiParam({ name: 'curriculumId', format: 'uuid' })
  @ApiJson(200, 'Categorias em ordem', arrayOf('ActivityCategory'))
  @ApiProblems(400, 401, 403, 404)
  async categories(
    @CurrentUserId() userId: string,
    @Param('curriculumId', idParam) curriculumId: string,
  ) {
    return this.list.execute(await this.loadActor.execute(userId), curriculumId)
  }

  @Post('curricula/:curriculumId/activity-categories')
  @ApiOperation({
    summary: 'Criar categoria de atividades',
    description: 'Sem teto (maxHours nulo), as horas contam inteiras.',
  })
  @ApiParam({ name: 'curriculumId', format: 'uuid' })
  @ApiJsonBody('ActivityCategoryInput')
  @ApiJson(201, 'Categoria criada', schemaRef('ActivityCategory'))
  @ApiProblems(400, 401, 403, 404)
  async create(
    @CurrentUserId() userId: string,
    @Param('curriculumId', idParam) curriculumId: string,
    @Body(new ZodValidationPipe(activityCategoryInputSchema))
    input: ActivityCategoryInput,
  ) {
    return this.save.create(
      await this.loadActor.execute(userId),
      curriculumId,
      input,
    )
  }

  @Put('activity-categories/:id')
  @ApiOperation({ summary: 'Alterar categoria de atividades' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('ActivityCategoryInput')
  @ApiJson(200, 'Categoria alterada', schemaRef('ActivityCategory'))
  @ApiProblems(400, 401, 403, 404)
  async update(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(activityCategoryInputSchema))
    input: ActivityCategoryInput,
  ) {
    return this.save.update(await this.loadActor.execute(userId), id, input)
  }

  @Delete('activity-categories/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Excluir categoria de atividades',
    description: 'As atividades da categoria ficam, sem categoria e sem teto.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(204, 'Categoria excluída')
  @ApiProblems(400, 401, 403, 404)
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    await this.save.delete(await this.loadActor.execute(userId), id)
  }
}
