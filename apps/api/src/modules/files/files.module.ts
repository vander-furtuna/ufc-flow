import { Module } from '@nestjs/common'

import { ENV, type Env } from '../../config/env'
import { IdentityModule } from '../identity/identity.module'
import {
  CleanupFilesUseCase,
  ReadFileUseCase,
  UploadFileUseCase,
} from './application/files.use-cases'
import { FILE_STORAGE, FILES_UOW, IMAGE_PROCESSOR } from './domain/ports'
import { FilesController } from './infrastructure/http/files.controller'
import { DrizzleFilesUnitOfWork } from './infrastructure/persistence/drizzle-files'
import { FilesCleanup } from './infrastructure/scheduling/files-cleanup'
import {
  LocalDiskStorage,
  UPLOADS_ROOT,
} from './infrastructure/storage/local-disk-storage'
import { SharpImageProcessor } from './infrastructure/storage/sharp-image-processor'

@Module({
  imports: [IdentityModule],
  controllers: [FilesController],
  providers: [
    { provide: FILES_UOW, useClass: DrizzleFilesUnitOfWork },
    {
      provide: UPLOADS_ROOT,
      inject: [ENV],
      useFactory: (env: Env) => env.UPLOADS_DIR,
    },
    { provide: FILE_STORAGE, useClass: LocalDiskStorage },
    { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessor },
    FilesCleanup,
    UploadFileUseCase,
    ReadFileUseCase,
    CleanupFilesUseCase,
  ],
})
export class FilesModule {}
