import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import {
  markNotificationsReadInputSchema,
  notificationListQuerySchema,
  notificationPreferencesSchema,
  type MarkNotificationsReadInput,
  type NotificationListQuery,
  type NotificationPreferences,
} from '@ufc-flow/contracts'

import {
  ApiJson,
  ApiJsonBody,
  ApiProblems,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
import {
  AuthGuard,
  CurrentUserId,
} from '../../../identity/infrastructure/http/auth.guard'
import {
  GetNotificationPreferencesUseCase,
  ListNotificationsUseCase,
  MarkNotificationsReadUseCase,
  SetNotificationPreferencesUseCase,
  UnreadCountUseCase,
} from '../../application/notifications.use-cases'

// Notificações de quem está logado (o sino do web)
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('v1/me')
export class NotificationsController {
  constructor(
    @Inject(ListNotificationsUseCase)
    private readonly list: ListNotificationsUseCase,
    @Inject(UnreadCountUseCase) private readonly unread: UnreadCountUseCase,
    @Inject(MarkNotificationsReadUseCase)
    private readonly markRead: MarkNotificationsReadUseCase,
    @Inject(GetNotificationPreferencesUseCase)
    private readonly getPreferences: GetNotificationPreferencesUseCase,
    @Inject(SetNotificationPreferencesUseCase)
    private readonly setPreferences: SetNotificationPreferencesUseCase,
  ) {}

  @Get('notifications')
  @ApiOperation({
    summary: 'Minhas notificações',
    description:
      'Da atualizada mais recentemente para a mais antiga (notificações agrupadas sobem quando somam). Os dados de cada tipo estão no schema Notification.',
  })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiJson(200, 'Página de notificações', schemaRef('NotificationPage'))
  @ApiProblems(400, 401)
  notifications(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(notificationListQuerySchema))
    query: NotificationListQuery,
  ) {
    return this.list.execute(userId, query)
  }

  @Get('notifications/unread-count')
  @ApiOperation({
    summary: 'Quantas notificações não lidas',
    description: 'O web consulta a cada 60 segundos para o contador do sino.',
  })
  @ApiJson(200, 'Contagem', schemaRef('UnreadCount'))
  @ApiProblems(401)
  unreadCount(@CurrentUserId() userId: string) {
    return this.unread.execute(userId)
  }

  @Post('notifications/read')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Marcar como lidas',
    description:
      'Algumas ({ ids }) ou todas ({ all: true }). Ids de outra pessoa são ignorados.',
  })
  @ApiJsonBody('MarkNotificationsReadInput')
  @ApiJson(204, 'Marcadas')
  @ApiProblems(400, 401)
  async read(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(markNotificationsReadInputSchema))
    input: MarkNotificationsReadInput,
  ) {
    await this.markRead.execute(userId, input)
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Tipos de notificação silenciados' })
  @ApiJson(200, 'Preferências', schemaRef('NotificationPreferences'))
  @ApiProblems(401)
  preferences(@CurrentUserId() userId: string) {
    return this.getPreferences.execute(userId)
  }

  @Put('notification-preferences')
  @ApiOperation({
    summary: 'Silenciar tipos de notificação',
    description:
      'A lista substitui a anterior. Tipos silenciados não são gravados.',
  })
  @ApiJsonBody('NotificationPreferences')
  @ApiJson(200, 'Preferências', schemaRef('NotificationPreferences'))
  @ApiProblems(400, 401)
  savePreferences(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(notificationPreferencesSchema))
    input: NotificationPreferences,
  ) {
    return this.setPreferences.execute(userId, input)
  }
}
