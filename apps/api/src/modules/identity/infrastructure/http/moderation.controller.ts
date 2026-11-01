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
  createModeratorRequestInputSchema,
  moderatorRequestListQuerySchema,
  moderatorRequestStatusSchema,
  reviewModeratorRequestInputSchema,
  uuidSchema,
  type CreateModeratorRequestInput,
  type ModeratorRequestListQuery,
  type ReviewModeratorRequestInput,
} from '@ufc-flow/contracts'

import {
  ApiJson,
  ApiJsonBody,
  ApiProblems,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
import { CancelModeratorRequestUseCase } from '../../application/cancel-moderator-request.use-case'
import { ListModeratorRequestsUseCase } from '../../application/list-moderator-requests.use-case'
import { LoadActorUseCase } from '../../application/load-actor.use-case'
import { RequestModerationUseCase } from '../../application/request-moderation.use-case'
import {
  ReviewModeratorRequestUseCase,
  type ReviewDecision,
} from '../../application/review-moderator-request.use-case'
import { AuthGuard, CurrentUserId } from './auth.guard'

const idParam = new ZodValidationPipe(uuidSchema)
const reviewBody = new ZodValidationPipe(reviewModeratorRequestInputSchema)

@ApiTags('identity')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/moderator-requests')
export class ModerationController {
  constructor(
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
    @Inject(RequestModerationUseCase)
    private readonly requestModeration: RequestModerationUseCase,
    @Inject(ListModeratorRequestsUseCase)
    private readonly listRequests: ListModeratorRequestsUseCase,
    @Inject(ReviewModeratorRequestUseCase)
    private readonly reviewRequest: ReviewModeratorRequestUseCase,
    @Inject(CancelModeratorRequestUseCase)
    private readonly cancelRequest: CancelModeratorRequestUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Pedir moderação de um curso',
    description:
      'Um pedido pendente por curso. Um administrador aprova ou rejeita.',
  })
  @ApiJsonBody('CreateModeratorRequestInput')
  @ApiJson(201, 'Pedido criado', schemaRef('ModeratorRequest'))
  @ApiProblems(400, 401, 403, 404, 409)
  async create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createModeratorRequestInputSchema))
    input: CreateModeratorRequestInput,
  ) {
    return this.requestModeration.execute(
      await this.loadActor.execute(userId),
      input,
    )
  }

  @Get()
  @ApiOperation({
    summary: 'Fila de pedidos de moderação (admin)',
    description: 'Do mais novo ao mais antigo, paginada por cursor.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: moderatorRequestStatusSchema.options,
  })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiJson(200, 'Página de pedidos', schemaRef('ModeratorRequestPage'))
  @ApiProblems(400, 401, 403)
  async list(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(moderatorRequestListQuerySchema))
    query: ModeratorRequestListQuery,
  ) {
    return this.listRequests.execute(
      await this.loadActor.execute(userId),
      query,
    )
  }

  private async review(
    userId: string,
    id: string,
    decision: ReviewDecision,
    input: ReviewModeratorRequestInput,
  ) {
    return this.reviewRequest.execute(
      await this.loadActor.execute(userId),
      id,
      decision,
      input.note ?? null,
    )
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aprovar pedido (admin)',
    description: 'Torna a pessoa moderadora do curso.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('ReviewModeratorRequestInput')
  @ApiJson(200, 'Pedido aprovado', schemaRef('ModeratorRequest'))
  @ApiProblems(400, 401, 403, 404, 409)
  approve(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(reviewBody) input: ReviewModeratorRequestInput,
  ) {
    return this.review(userId, id, 'APPROVED', input)
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rejeitar pedido (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJsonBody('ReviewModeratorRequestInput')
  @ApiJson(200, 'Pedido rejeitado', schemaRef('ModeratorRequest'))
  @ApiProblems(400, 401, 403, 404, 409)
  reject(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
    @Body(reviewBody) input: ReviewModeratorRequestInput,
  ) {
    return this.review(userId, id, 'REJECTED', input)
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancelar o próprio pedido pendente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiJson(200, 'Pedido cancelado', schemaRef('ModeratorRequest'))
  @ApiProblems(400, 401, 403, 404, 409)
  async cancel(
    @CurrentUserId() userId: string,
    @Param('id', idParam) id: string,
  ) {
    return this.cancelRequest.execute(await this.loadActor.execute(userId), id)
  }
}
