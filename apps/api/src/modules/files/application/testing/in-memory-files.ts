import { Readable } from 'node:stream'

import { isOrphaned, type FileRecord } from '../../domain/file'
import type {
  FileRepository,
  FileStorage,
  FilesUnitOfWork,
  ImageProcessor,
} from '../../domain/ports'

const clone = <T>(value: T): T => structuredClone(value)

export class InMemoryFiles implements FilesUnitOfWork {
  files = new Map<string, FileRecord>()

  readonly repository: FileRepository = {
    findById: async (id) => clone(this.files.get(id) ?? null),
    save: async (file) => {
      this.files.set(file.id, clone(file))
    },
    insert: async (file) => {
      this.files.set(file.id, clone(file))
    },
    countRecentUploads: async (ownerId, since) =>
      [...this.files.values()].filter(
        (file) => file.ownerId === ownerId && file.createdAt >= since,
      ).length,
    listForCleanup: async (pendingBefore) =>
      [...this.files.values()].filter(
        (file) =>
          (file.status === 'PENDING' && file.createdAt < pendingBefore) ||
          file.deletedAt !== null ||
          isOrphaned(file),
      ),
    delete: async (id) => {
      this.files.delete(id)
    },
  }

  run<T>(work: (files: FileRepository) => Promise<T>) {
    return work(this.repository)
  }
}

export class MemoryStorage implements FileStorage {
  objects = new Map<string, Uint8Array>()

  async put(key: string, content: Uint8Array) {
    this.objects.set(key, content)
  }

  async read(key: string) {
    const content = this.objects.get(key)
    if (!content) throw new Error(`sem ${key}`)
    return Readable.from(Buffer.from(content))
  }

  async delete(key: string) {
    this.objects.delete(key)
  }
}

// Finge o sharp: devolve bytes marcados e um tamanho fixo
export class FakeImageProcessor implements ImageProcessor {
  calls = 0

  async process(content: Uint8Array) {
    this.calls++
    return {
      content: new Uint8Array([
        ...new TextEncoder().encode('WEBP:'),
        ...content.slice(0, 4),
      ]),
      width: 800,
      height: 600,
    }
  }
}
