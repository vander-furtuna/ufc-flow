import { Module } from '@nestjs/common'

import { IdentityModule } from '../identity/identity.module'
import {
  EventNotifier,
  GetNotificationPreferencesUseCase,
  ListNotificationsUseCase,
  MarkNotificationsReadUseCase,
  NotificationDispatcher,
  PurgeNotificationsUseCase,
  SetNotificationPreferencesUseCase,
  UnreadCountUseCase,
} from './application/notifications.use-cases'
import { NOTIFICATIONS_UOW } from './domain/ports'
import { NotificationListener } from './infrastructure/events/notification-listener'
import { NotificationsController } from './infrastructure/http/notifications.controller'
import { DrizzleNotificationsUnitOfWork } from './infrastructure/persistence/drizzle-notifications'
import { NotificationsRetention } from './infrastructure/scheduling/notifications-retention'

@Module({
  imports: [IdentityModule],
  controllers: [NotificationsController],
  providers: [
    { provide: NOTIFICATIONS_UOW, useClass: DrizzleNotificationsUnitOfWork },
    NotificationDispatcher,
    EventNotifier,
    NotificationListener,
    NotificationsRetention,
    ListNotificationsUseCase,
    UnreadCountUseCase,
    MarkNotificationsReadUseCase,
    GetNotificationPreferencesUseCase,
    SetNotificationPreferencesUseCase,
    PurgeNotificationsUseCase,
  ],
})
export class NotificationsModule {}
