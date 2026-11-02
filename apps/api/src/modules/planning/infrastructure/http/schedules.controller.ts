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
  scheduleImportInputSchema,
  scheduleInputSchema,
  scheduleListQuerySchema,
  uuidSchema,
  type ScheduleImportInput,
  type ScheduleInput,
  type ScheduleListQuery,
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
  DeleteScheduleUseCase,
  ImportSchedulesUseCase,
  ListSchedulesUseCase,
  SaveScheduleUseCase,
} from '../../application/schedules.use-cases'

const idParam = new ZodValidationPipe(uuidSchema)

// Agendas sincronizadas de quem está logado. Sem login, a agenda continua
// no IndexedDB do navegador.
@ApiTags('planning')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/me/schedules')
export class SchedulesController {
  constructor(
    @Inject(ListSchedulesUseCase) private readonly list: ListSchedulesUseCase,
    @Inject(SaveScheduleUseCase) private readonly save: SaveScheduleUseCase,
    @Inject(DeleteScheduleUseCase)
    private readonly remove: DeleteScheduleUseCase,
    @Inject(ImportSchedulesUseCase)
    private readonly importer: ImportSchedulesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Minhas agendas',
    description:
      'Com as turmas atuais e os avisos de horário alterado (changed) e turma removida do SIGAA (removed). Os filtros são opcionais.',
  })
  @ApiQuery({
    name: 'course',
    required: false,
    example: 'engenharia-de-computacao',
  })
  @ApiQuery({ name: 'curriculum', required: false, example: '2006-2' })
  @ApiQuery({ name: 'term', required: false, example: '2026.2' })
  @ApiJson(200, 'Agendas em ordem', arrayOf('Schedule'))
  @ApiProblems(400, 401)
  schedules(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(scheduleListQuerySchema))
    query: ScheduleListQuery,
  ) {
    return this.list.execute(userId, query)
  }

  @Post('import')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Importar as agendas locais',
    description:
      'Cada agenda vai com o UUID local, que vira o id no servidor: reenviar não duplica (ALREADY_IMPORTED). As turmas são achadas pela chave natural; as que não existem voltam em notFound e as que repetem disciplina ou conflitam, em skipped.',
  })
  @ApiJsonBody('ScheduleImportInput')
  @ApiJson(200, 'Resultado por agenda', schemaRef('ScheduleImportResponse'))
  @ApiProblems(400, 401)
  importSchedules(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(scheduleImportInputSchema))
    input: ScheduleImportInput,
  ) {
    return this.importer.execute(userId, input)
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Criar ou substituir uma agenda',
    description:
      'O id é gerado no cliente. A agenda é gravada inteira e vale a última escrita. Turma nova não pode repetir disciplina, conflitar no horário nem estar removida; as que já estavam ficam mesmo se o horário mudou no SIGAA.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('ScheduleInput')
  @ApiJson(200, 'Agenda gravada', schemaRef('Schedule'))
  @ApiProblems(400, 401, 404, 409)
  put(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(scheduleInputSchema)) input: ScheduleInput,
  ) {
    return this.save.execute(userId, id, input)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir uma agenda' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(204, 'Agenda excluída')
  @ApiProblems(400, 401, 404)
  async delete(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    await this.remove.execute(userId, id)
  }
}
