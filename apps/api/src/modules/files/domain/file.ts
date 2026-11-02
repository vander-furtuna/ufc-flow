import type {
  FilePurpose,
  FileStatus,
  FileVisibility,
} from '@ufc-flow/contracts'

import { AccessPolicy, type Actor } from '../../../shared/domain/access-policy'
import { FilesErrors } from './errors'

const MB = 1024 * 1024

export type ContentKind = 'image' | 'pdf'

type FilePolicy = {
  visibility: FileVisibility
  kinds: readonly ContentKind[]
  // Tamanho do arquivo enviado, antes do reprocessamento
  maxBytes: number
  // Arquivo de um curso (posts e página de links): exige quem o gerencia
  courseScoped: boolean
}

// Regras por finalidade (modelagem, Arquivos e imagens; limites da fase 8)
export const FILE_POLICIES: Record<FilePurpose, FilePolicy> = {
  AVATAR: {
    visibility: 'PUBLIC',
    kinds: ['image'],
    maxBytes: 5 * MB,
    courseScoped: false,
  },
  POST_COVER: {
    visibility: 'PUBLIC',
    kinds: ['image'],
    maxBytes: 8 * MB,
    courseScoped: true,
  },
  POST_IMAGE: {
    visibility: 'PUBLIC',
    kinds: ['image'],
    maxBytes: 8 * MB,
    courseScoped: true,
  },
  CERTIFICATE: {
    visibility: 'PRIVATE',
    kinds: ['image', 'pdf'],
    maxBytes: 10 * MB,
    courseScoped: false,
  },
  LINK_PAGE_IMAGE: {
    visibility: 'PUBLIC',
    kinds: ['image'],
    maxBytes: 8 * MB,
    courseScoped: true,
  },
  LINK_THUMBNAIL: {
    visibility: 'PUBLIC',
    kinds: ['image'],
    maxBytes: 8 * MB,
    courseScoped: true,
  },
  LINK_FILE: {
    visibility: 'PUBLIC',
    kinds: ['pdf'],
    maxBytes: 15 * MB,
    courseScoped: true,
  },
}

// Arquivos pessoais (não são de um curso): somem com a conta (LGPD)
export const PERSONAL_PURPOSES = (
  Object.keys(FILE_POLICIES) as FilePurpose[]
).filter((purpose) => !FILE_POLICIES[purpose].courseScoped)

// Sem dono (pessoal de conta excluída) ou sem curso (curso excluído): não é
// mais servido e a limpeza apaga
export const isOrphaned = (file: FileRecord) =>
  PERSONAL_PURPOSES.includes(file.purpose)
    ? file.ownerId === null
    : file.courseId === null

// O maior limite: o upload é recusado antes de ler tudo para a memória
export const MAX_UPLOAD_BYTES = Math.max(
  ...Object.values(FILE_POLICIES).map((policy) => policy.maxBytes),
)

// Imagens maiores que isso em pixels são recusadas (bomba de descompressão)
export const MAX_IMAGE_PIXELS = 40_000_000

// Imagens são reduzidas a no máximo 2000 px no lado maior
export const MAX_IMAGE_SIDE = 2000

export const UPLOADS_PER_HOUR = 60

export type FileRecord = {
  id: string
  ownerId: string | null
  courseId: string | null
  purpose: FilePurpose
  visibility: FileVisibility
  storageKey: string
  originalName: string
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  sha256: string
  status: FileStatus
  createdAt: Date
  attachedAt: Date | null
  deletedAt: Date | null
}

export type DetectedContent = { kind: ContentKind; mime: string }

const startsWith = (
  content: Uint8Array,
  signature: readonly number[],
  at = 0,
) => signature.every((byte, index) => content[at + index] === byte)

// Assinaturas são ASCII: um byte por caractere
const ascii = (text: string) =>
  Array.from({ length: text.length }, (_, index) => text.charCodeAt(index))

// O tipo vem dos bytes (assinatura), nunca da extensão ou do content-type.
// HEIC fica de fora: o sharp distribuído não decodifica.
export function detectContent(content: Uint8Array): DetectedContent | null {
  if (startsWith(content, [0xff, 0xd8, 0xff])) {
    return { kind: 'image', mime: 'image/jpeg' }
  }
  if (startsWith(content, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: 'image', mime: 'image/png' }
  }
  if (
    startsWith(content, ascii('RIFF')) &&
    startsWith(content, ascii('WEBP'), 8)
  ) {
    return { kind: 'image', mime: 'image/webp' }
  }
  if (
    startsWith(content, ascii('GIF87a')) ||
    startsWith(content, ascii('GIF89a'))
  ) {
    return { kind: 'image', mime: 'image/gif' }
  }
  if (startsWith(content, ascii('ftypavif'), 4)) {
    return { kind: 'image', mime: 'image/avif' }
  }
  if (startsWith(content, ascii('%PDF-'))) {
    return { kind: 'pdf', mime: 'application/pdf' }
  }
  return null
}

const KIND_LABELS: Record<ContentKind, string> = {
  image: 'uma imagem JPEG, PNG, WebP, GIF ou AVIF',
  pdf: 'um PDF',
}

// Quem pode enviar, para quê, de que tipo e tamanho
export function checkUpload(input: {
  actor: Actor
  purpose: FilePurpose
  courseId: string | null
  content: Uint8Array
  sizeBytes: number
  recentUploads: number
}): DetectedContent {
  const policy = FILE_POLICIES[input.purpose]
  if (input.actor.userId === null) throw FilesErrors.accessDenied()
  if (policy.courseScoped) {
    if (!input.courseId) throw FilesErrors.courseRequired()
    if (!AccessPolicy.canManageCurricula(input.actor, input.courseId)) {
      throw FilesErrors.accessDenied()
    }
  } else if (input.courseId) {
    throw FilesErrors.courseNotAllowed()
  }
  if (input.recentUploads >= UPLOADS_PER_HOUR) throw FilesErrors.uploadLimit()
  if (input.sizeBytes > policy.maxBytes) {
    throw FilesErrors.tooLarge(policy.maxBytes / MB)
  }
  const detected = detectContent(input.content)
  if (!detected || !policy.kinds.includes(detected.kind)) {
    throw FilesErrors.typeNotAllowed(
      policy.kinds.map((kind) => KIND_LABELS[kind]).join(' ou '),
    )
  }
  return detected
}

// Caminho no disco: {finalidade}/{aaaa}/{mm}/{id}.{ext}; o nome original
// fica só no banco
export function storageKey(
  purpose: FilePurpose,
  now: Date,
  id: string,
  extension: string,
): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${purpose.toLowerCase()}/${now.getUTCFullYear()}/${month}/${id}.${extension}`
}

// Só o dono liga um arquivo pendente, na finalidade para a qual foi enviado
export function checkAttachable(
  file: FileRecord,
  expected: { ownerId: string; purpose: FilePurpose },
): void {
  if (file.ownerId !== expected.ownerId || file.deletedAt) {
    throw FilesErrors.fileNotFound()
  }
  if (file.purpose !== expected.purpose) throw FilesErrors.wrongPurpose()
  if (file.status === 'ATTACHED') throw FilesErrors.alreadyAttached()
}

export const attachFile = (file: FileRecord, now: Date): FileRecord => ({
  ...file,
  status: 'ATTACHED',
  attachedAt: now,
})

// A entidade soltou o arquivo: o job apaga do disco depois
export const markDeleted = (file: FileRecord, now: Date): FileRecord =>
  file.deletedAt ? file : { ...file, deletedAt: now }
