import type { Readable } from 'node:stream'

import type { FileRecord } from './file'

// Usada também pelos módulos que ligam arquivos (perfil, posts, atividades),
// dentro da transação deles
export interface FileAttachmentRepository {
  findById(id: string): Promise<FileRecord | null>
  save(file: FileRecord): Promise<void>
}

export interface FileRepository extends FileAttachmentRepository {
  insert(file: FileRecord): Promise<void>
  countRecentUploads(ownerId: string, since: Date): Promise<number>
  // Pendentes antigos e os marcados como apagados
  listForCleanup(pendingBefore: Date): Promise<FileRecord[]>
  delete(id: string): Promise<void>
}

export interface FilesUnitOfWork {
  run<T>(work: (files: FileRepository) => Promise<T>): Promise<T>
}

// Onde os bytes ficam (hoje o disco da VM; MinIO ou S3 depois)
export interface FileStorage {
  put(key: string, content: Uint8Array): Promise<void>
  read(key: string): Promise<Readable>
  delete(key: string): Promise<void>
}

export type ProcessedImage = {
  content: Uint8Array
  width: number
  height: number
}

// WebP, no máximo 2000 px no lado maior e sem EXIF
export interface ImageProcessor {
  process(content: Uint8Array): Promise<ProcessedImage>
}

export const FILES_UOW = Symbol('FilesUnitOfWork')
export const FILE_STORAGE = Symbol('FileStorage')
export const IMAGE_PROCESSOR = Symbol('ImageProcessor')
