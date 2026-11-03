import { Module } from '@nestjs/common'

import { IdentityModule } from '../identity/identity.module'
import {
  ManageLinkPageUseCase,
  PublicLinkPageUseCase,
} from './application/link-page.use-cases'
import { LINK_PAGE_UOW } from './domain/ports'
import {
  ManageLinkPageController,
  PublicLinkPageController,
} from './infrastructure/http/link-page.controller'
import { DrizzleLinkPageUnitOfWork } from './infrastructure/persistence/drizzle-link-page'

@Module({
  imports: [IdentityModule],
  controllers: [ManageLinkPageController, PublicLinkPageController],
  providers: [
    { provide: LINK_PAGE_UOW, useClass: DrizzleLinkPageUnitOfWork },
    ManageLinkPageUseCase,
    PublicLinkPageUseCase,
  ],
})
export class LinkPageModule {}
