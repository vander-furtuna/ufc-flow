import { describe, expect, it } from 'vitest'

import type { Actor } from '../../../shared/domain/access-policy'
import {
  attachFile,
  checkAttachable,
  checkUpload,
  detectContent,
  FILE_POLICIES,
  isOrphaned,
  markDeleted,
  storageKey,
  type FileRecord,
} from './file'

const NOW = new Date('2026-11-02T12:00:00.000Z')
const MB = 1024 * 1024

const bytes = (...values: number[]) => new Uint8Array(values)
const ascii = (text: string) => new TextEncoder().encode(text)
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10)
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)
const WEBP = concat(ascii('RIFF'), bytes(0, 0, 0, 0), ascii('WEBPVP8 '))
const GIF = ascii('GIF89a....')
const AVIF = concat(bytes(0, 0, 0, 0x1c), ascii('ftypavif'))
const HEIC = concat(bytes(0, 0, 0, 0x18), ascii('ftypheic'))
const PDF = ascii('%PDF-1.7\n')

const actor = (overrides: Partial<Actor> = {}): Actor => ({
  userId: 'u1',
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(),
  ...overrides,
})

const record = (overrides: Partial<FileRecord> = {}): FileRecord => ({
  id: 'f1',
  ownerId: 'u1',
  courseId: null,
  purpose: 'AVATAR',
  visibility: 'PUBLIC',
  storageKey: 'avatar/2026/11/f1.webp',
  originalName: 'foto.jpg',
  mimeType: 'image/webp',
  sizeBytes: 1000,
  width: 400,
  height: 400,
  sha256: 'abc',
  status: 'PENDING',
  createdAt: NOW,
  attachedAt: null,
  deletedAt: null,
  ...overrides,
})

describe('detectContent', () => {
  it.each([
    ['JPEG', JPEG, 'image', 'image/jpeg'],
    ['PNG', PNG, 'image', 'image/png'],
    ['WebP', WEBP, 'image', 'image/webp'],
    ['GIF', GIF, 'image', 'image/gif'],
    ['AVIF', AVIF, 'image', 'image/avif'],
    ['PDF', PDF, 'pdf', 'application/pdf'],
  ])('reconhece %s pelos bytes', (_, content, kind, mime) => {
    expect(detectContent(content)).toEqual({ kind, mime })
  })

  it('não reconhece HEIC, texto nem arquivo vazio', () => {
    expect(detectContent(HEIC)).toBeNull()
    expect(
      detectContent(ascii('<svg xmlns="http://www.w3.org/2000/svg">')),
    ).toBeNull()
    expect(detectContent(new Uint8Array())).toBeNull()
  })
})

describe('checkUpload', () => {
  const upload = (overrides: Record<string, unknown> = {}) => ({
    actor: actor(),
    purpose: 'AVATAR' as const,
    courseId: null,
    content: JPEG,
    sizeBytes: 1 * MB,
    recentUploads: 0,
    ...overrides,
  })

  it('aceita o tipo da finalidade e devolve o que foi detectado', () => {
    expect(checkUpload(upload())).toEqual({ kind: 'image', mime: 'image/jpeg' })
    expect(
      checkUpload(upload({ purpose: 'CERTIFICATE', content: PDF })),
    ).toEqual({ kind: 'pdf', mime: 'application/pdf' })
  })

  it('recusa tipo errado, desconhecido e grande demais', () => {
    expect(() => checkUpload(upload({ content: PDF }))).toThrow(
      expect.objectContaining({ code: 'FILE_TYPE_NOT_ALLOWED' }),
    )
    expect(() =>
      checkUpload(
        upload({
          purpose: 'LINK_FILE',
          courseId: 'c1',
          actor: actor({ isAdmin: true }),
          content: PNG,
        }),
      ),
    ).toThrow(expect.objectContaining({ code: 'FILE_TYPE_NOT_ALLOWED' }))
    expect(() => checkUpload(upload({ content: HEIC }))).toThrow(
      expect.objectContaining({ code: 'FILE_TYPE_NOT_ALLOWED' }),
    )
    expect(() =>
      checkUpload(upload({ sizeBytes: FILE_POLICIES.AVATAR.maxBytes + 1 })),
    ).toThrow(expect.objectContaining({ code: 'FILE_TOO_LARGE' }))
  })

  it('finalidade do curso exige o curso e quem o gerencia', () => {
    const cover = { purpose: 'POST_COVER' as const }
    expect(() => checkUpload(upload(cover))).toThrow(
      expect.objectContaining({ code: 'FILE_COURSE_REQUIRED' }),
    )
    expect(() => checkUpload(upload({ ...cover, courseId: 'c1' }))).toThrow(
      expect.objectContaining({ code: 'ACCESS_DENIED' }),
    )
    expect(
      checkUpload(
        upload({
          ...cover,
          courseId: 'c1',
          actor: actor({ moderatedCourseIds: new Set(['c1']) }),
        }),
      ).kind,
    ).toBe('image')
    // Arquivo pessoal não leva curso
    expect(() => checkUpload(upload({ courseId: 'c1' }))).toThrow(
      expect.objectContaining({ code: 'FILE_COURSE_NOT_ALLOWED' }),
    )
  })

  it('capa e imagem de post institucional: admin envia sem curso (D82)', () => {
    const admin = actor({ isAdmin: true })
    for (const purpose of ['POST_COVER', 'POST_IMAGE'] as const) {
      expect(checkUpload(upload({ purpose, actor: admin })).kind).toBe('image')
    }
    expect(() =>
      checkUpload(upload({ purpose: 'LINK_FILE', actor: admin })),
    ).toThrow(expect.objectContaining({ code: 'FILE_COURSE_REQUIRED' }))
  })

  it('exige login e limita 60 envios por hora', () => {
    expect(() =>
      checkUpload(upload({ actor: actor({ userId: null }) })),
    ).toThrow(expect.objectContaining({ code: 'ACCESS_DENIED' }))
    expect(() => checkUpload(upload({ recentUploads: 60 }))).toThrow(
      expect.objectContaining({ code: 'FILE_UPLOAD_LIMIT' }),
    )
  })
})

describe('caminho e ciclo de vida', () => {
  it('caminho pela finalidade e data, sem o nome original', () => {
    expect(storageKey('POST_IMAGE', NOW, 'abc', 'webp')).toBe(
      'post_image/2026/11/abc.webp',
    )
  })

  it('liga ao dono na finalidade certa, só uma vez', () => {
    expect(attachFile(record(), NOW)).toMatchObject({
      status: 'ATTACHED',
      attachedAt: NOW,
    })
    expect(() =>
      checkAttachable(record(), { ownerId: 'u2', purpose: 'AVATAR' }),
    ).toThrow(expect.objectContaining({ code: 'FILE_NOT_FOUND' }))
    expect(() =>
      checkAttachable(record(), { ownerId: 'u1', purpose: 'POST_COVER' }),
    ).toThrow(expect.objectContaining({ code: 'FILE_WRONG_PURPOSE' }))
    expect(() =>
      checkAttachable(record({ status: 'ATTACHED' }), {
        ownerId: 'u1',
        purpose: 'AVATAR',
      }),
    ).toThrow(expect.objectContaining({ code: 'FILE_ALREADY_ATTACHED' }))
    expect(() =>
      checkAttachable(record({ deletedAt: NOW }), {
        ownerId: 'u1',
        purpose: 'AVATAR',
      }),
    ).toThrow(expect.objectContaining({ code: 'FILE_NOT_FOUND' }))
    expect(
      checkAttachable(record(), { ownerId: 'u1', purpose: 'AVATAR' }),
    ).toBeUndefined()
  })

  it('pessoal sem dono e do curso sem curso ficam órfãos', () => {
    expect(isOrphaned(record())).toBe(false)
    expect(isOrphaned(record({ ownerId: null }))).toBe(true)
    const cover = { purpose: 'POST_COVER' as const, ownerId: null }
    expect(isOrphaned(record({ ...cover, courseId: 'c1' }))).toBe(false)
    // Capa sem curso é de post institucional, não de curso excluído (D82)
    expect(isOrphaned(record({ ...cover, courseId: null }))).toBe(false)
    const thumbnail = { purpose: 'LINK_THUMBNAIL' as const, ownerId: null }
    expect(isOrphaned(record({ ...thumbnail, courseId: null }))).toBe(true)
  })

  it('marcar como apagado não apaga de novo', () => {
    const deleted = markDeleted(record(), NOW)
    expect(deleted.deletedAt).toBe(NOW)
    expect(markDeleted(deleted, new Date()).deletedAt).toBe(NOW)
  })
})
