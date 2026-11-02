import { Inject, Injectable } from '@nestjs/common'
import {
  and,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
  or,
} from 'drizzle-orm'

import { DATABASE, type Database } from '../../../../database/database.module'
import type { Executor } from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import { PERSONAL_PURPOSES, type FileRecord } from '../../domain/file'
import type {
  FileAttachmentRepository,
  FileRepository,
  FilesUnitOfWork,
} from '../../domain/ports'
import { files } from './files.schema'

// Para os módulos que ligam arquivos dentro da própria transação
export function fileAttachmentRepository(
  db: Executor,
): FileAttachmentRepository {
  return {
    async findById(id) {
      const [row] = await db.select().from(files).where(eq(files.id, id))
      return row ?? null
    },
    async save(file: FileRecord) {
      await db.update(files).set(file).where(eq(files.id, file.id))
    },
  }
}

export function fileRepository(db: Executor): FileRepository {
  return {
    ...fileAttachmentRepository(db),
    async insert(file) {
      await db.insert(files).values(file)
    },
    async countRecentUploads(ownerId, since) {
      const [row] = await db
        .select({ total: count() })
        .from(files)
        .where(and(eq(files.ownerId, ownerId), gte(files.createdAt, since)))
      return row?.total ?? 0
    },
    listForCleanup(pendingBefore) {
      return db
        .select()
        .from(files)
        .where(
          or(
            and(
              eq(files.status, 'PENDING'),
              lt(files.createdAt, pendingBefore),
            ),
            isNotNull(files.deletedAt),
            // Pessoais sem dono: a conta foi excluída (LGPD)
            and(
              isNull(files.ownerId),
              inArray(files.purpose, [...PERSONAL_PURPOSES]),
            ),
            // Do curso sem curso: o curso foi excluído
            and(
              isNull(files.courseId),
              notInArray(files.purpose, [...PERSONAL_PURPOSES]),
            ),
          ),
        )
    },
    async delete(id) {
      await db.delete(files).where(eq(files.id, id))
    },
  }
}

@Injectable()
export class DrizzleFilesUnitOfWork implements FilesUnitOfWork {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  run<T>(work: (repository: FileRepository) => Promise<T>) {
    return this.db.transaction((tx) => work(fileRepository(tx)))
  }
}
