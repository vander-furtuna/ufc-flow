import { createHash } from 'node:crypto'
import type { Readable } from 'node:stream'

import { Inject, Injectable } from '@nestjs/common'
import type { FilePurpose, FileView } from '@ufc-flow/contracts'

import type { Actor } from '../../../shared/domain/access-policy'
import { CLOCK, type Clock } from '../../../shared/domain/clock'
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../shared/domain/id-generator'
import { FilesErrors } from '../domain/errors'
import {
  checkUpload,
  FILE_POLICIES,
  isOrphaned,
  storageKey,
  type FileRecord,
} from '../domain/file'
import {
  FILE_STORAGE,
  FILES_UOW,
  IMAGE_PROCESSOR,
  type FileStorage,
  type FilesUnitOfWork,
  type ImageProcessor,
} from '../domain/ports'

const HOUR = 60 * 60 * 1000

export const toFileView = (file: FileRecord): FileView => ({
  id: file.id,
  purpose: file.purpose,
  visibility: file.visibility,
  status: file.status,
  originalName: file.originalName,
  mimeType: file.mimeType,
  sizeBytes: file.sizeBytes,
  width: file.width,
  height: file.height,
  createdAt: file.createdAt.toISOString(),
})

// Nome original só para exibição: sem caminho e com tamanho limitado
const cleanName = (name: string) =>
  (name.split(/[\\/]/).at(-1) ?? 'arquivo').trim().slice(0, 200) || 'arquivo'

@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject(FILES_UOW) private readonly uow: FilesUnitOfWork,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    @Inject(IMAGE_PROCESSOR) private readonly images: ImageProcessor,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(
    actor: Actor,
    input: {
      purpose: FilePurpose
      courseId: string | null
      originalName: string
      content: Uint8Array
    },
  ): Promise<FileView> {
    const now = this.clock.now()
    const recentUploads =
      actor.userId === null
        ? 0
        : await this.uow.run((files) =>
            files.countRecentUploads(
              actor.userId!,
              new Date(now.getTime() - HOUR),
            ),
          )
    const detected = checkUpload({
      actor,
      purpose: input.purpose,
      courseId: input.courseId,
      content: input.content,
      sizeBytes: input.content.byteLength,
      recentUploads,
    })

    // Imagens são reprocessadas (WebP, 2000 px, sem EXIF); PDF vai como veio
    const processed =
      detected.kind === 'image'
        ? await this.images.process(input.content)
        : { content: input.content, width: null, height: null }
    const extension = detected.kind === 'image' ? 'webp' : 'pdf'
    const id = this.ids.next()
    const file: FileRecord = {
      id,
      ownerId: actor.userId,
      courseId: input.courseId,
      purpose: input.purpose,
      visibility: FILE_POLICIES[input.purpose].visibility,
      storageKey: storageKey(input.purpose, now, id, extension),
      originalName: cleanName(input.originalName),
      mimeType: detected.kind === 'image' ? 'image/webp' : detected.mime,
      sizeBytes: processed.content.byteLength,
      width: processed.width,
      height: processed.height,
      sha256: createHash('sha256').update(processed.content).digest('hex'),
      status: 'PENDING',
      createdAt: now,
      attachedAt: null,
      deletedAt: null,
    }
    // Disco antes do banco: se o banco falhar, o arquivo órfão não tem
    // registro e não é servido
    await this.storage.put(file.storageKey, processed.content)
    await this.uow.run((files) => files.insert(file))
    return toFileView(file)
  }
}

// Entrega: públicos para qualquer um; privados só para o dono
@Injectable()
export class ReadFileUseCase {
  constructor(
    @Inject(FILES_UOW) private readonly uow: FilesUnitOfWork,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  async execute(
    userId: string | null,
    id: string,
  ): Promise<{ file: FileView; content: Readable }> {
    const file = await this.uow.run((files) => files.findById(id))
    if (
      !file ||
      file.deletedAt ||
      isOrphaned(file) ||
      (file.visibility === 'PRIVATE' && file.ownerId !== userId)
    ) {
      throw FilesErrors.fileNotFound()
    }
    return {
      file: toFileView(file),
      content: await this.storage.read(file.storageKey),
    }
  }
}

// Job diário: apaga do disco e do banco os pendentes com mais de 24 h e os
// que as entidades soltaram
@Injectable()
export class CleanupFilesUseCase {
  constructor(
    @Inject(FILES_UOW) private readonly uow: FilesUnitOfWork,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<number> {
    const before = new Date(this.clock.now().getTime() - 24 * HOUR)
    const stale = await this.uow.run((files) => files.listForCleanup(before))
    for (const file of stale) {
      await this.storage.delete(file.storageKey)
      await this.uow.run((files) => files.delete(file.id))
    }
    return stale.length
  }
}
