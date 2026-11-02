import { text } from 'node:stream/consumers'

import { describe, expect, it } from 'vitest'

import type { Actor } from '../../../shared/domain/access-policy'
import {
  SequentialIds,
  SteppingClock,
} from '../../catalog/application/testing/in-memory-catalog'
import {
  CleanupFilesUseCase,
  ReadFileUseCase,
  UploadFileUseCase,
} from './files.use-cases'
import {
  FakeImageProcessor,
  InMemoryFiles,
  MemoryStorage,
} from './testing/in-memory-files'

const HOUR = 60 * 60 * 1000
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
const PDF = new TextEncoder().encode('%PDF-1.7 conteúdo')

const actor = (userId: string | null = 'u1'): Actor => ({
  userId,
  isAdmin: false,
  moderatedCourseIds: new Set(),
  enrolledCourseIds: new Set(),
})

function harness() {
  const store = new InMemoryFiles()
  const storage = new MemoryStorage()
  const images = new FakeImageProcessor()
  const clock = new SteppingClock('2026-11-02T12:00:00.000Z')
  const ids = new SequentialIds()
  return {
    store,
    storage,
    images,
    clock,
    upload: new UploadFileUseCase(store, storage, images, clock, ids),
    read: new ReadFileUseCase(store, storage),
    cleanup: new CleanupFilesUseCase(store, storage, clock),
  }
}

describe('envio', () => {
  it('imagem vira WebP reprocessado, pendente, no caminho da finalidade', async () => {
    const h = harness()
    const view = await h.upload.execute(actor(), {
      purpose: 'AVATAR',
      courseId: null,
      originalName: 'C:\\fotos\\eu.jpg',
      content: JPEG,
    })
    expect(view).toMatchObject({
      purpose: 'AVATAR',
      visibility: 'PUBLIC',
      status: 'PENDING',
      originalName: 'eu.jpg',
      mimeType: 'image/webp',
      width: 800,
      height: 600,
    })
    const stored = h.store.files.get(view.id)!
    expect(stored.storageKey).toBe(`avatar/2026/11/${view.id}.webp`)
    expect(stored.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(h.storage.objects.get(stored.storageKey)).toEqual(
      new Uint8Array([
        ...new TextEncoder().encode('WEBP:'),
        0xff,
        0xd8,
        0xff,
        0xe0,
      ]),
    )
    expect(h.images.calls).toBe(1)
  })

  it('PDF vai sem reprocessar e o certificado é privado', async () => {
    const h = harness()
    const view = await h.upload.execute(actor(), {
      purpose: 'CERTIFICATE',
      courseId: null,
      originalName: 'certificado.pdf',
      content: PDF,
    })
    expect(view).toMatchObject({
      visibility: 'PRIVATE',
      mimeType: 'application/pdf',
      width: null,
      sizeBytes: PDF.byteLength,
    })
    expect(h.images.calls).toBe(0)
  })

  it('recusa tipo errado e conta o limite por hora', async () => {
    const h = harness()
    await expect(
      h.upload.execute(actor(), {
        purpose: 'AVATAR',
        courseId: null,
        originalName: 'x.jpg',
        content: PDF,
      }),
    ).rejects.toMatchObject({ code: 'FILE_TYPE_NOT_ALLOWED' })
    expect(h.storage.objects.size).toBe(0)
    for (let index = 0; index < 60; index++) {
      await h.upload.execute(actor(), {
        purpose: 'AVATAR',
        courseId: null,
        originalName: 'x.jpg',
        content: JPEG,
      })
    }
    await expect(
      h.upload.execute(actor(), {
        purpose: 'AVATAR',
        courseId: null,
        originalName: 'x.jpg',
        content: JPEG,
      }),
    ).rejects.toMatchObject({ code: 'FILE_UPLOAD_LIMIT' })
    await expect(
      h.upload.execute(actor(null), {
        purpose: 'AVATAR',
        courseId: null,
        originalName: 'x.jpg',
        content: JPEG,
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })
})

describe('entrega e limpeza', () => {
  async function withFiles() {
    const h = harness()
    const avatar = await h.upload.execute(actor(), {
      purpose: 'AVATAR',
      courseId: null,
      originalName: 'eu.jpg',
      content: JPEG,
    })
    const certificate = await h.upload.execute(actor(), {
      purpose: 'CERTIFICATE',
      courseId: null,
      originalName: 'c.pdf',
      content: PDF,
    })
    return { h, avatar, certificate }
  }

  it('público para todos; privado só para o dono', async () => {
    const { h, avatar, certificate } = await withFiles()
    const publicRead = await h.read.execute(null, avatar.id)
    expect(publicRead.file.id).toBe(avatar.id)
    expect(await text(publicRead.content)).toContain('WEBP:')
    expect(
      await text((await h.read.execute('u1', certificate.id)).content),
    ).toContain('%PDF-1.7')
    await expect(h.read.execute('u2', certificate.id)).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    })
    await expect(h.read.execute(null, certificate.id)).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    })
    await expect(h.read.execute(null, 'nada')).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    })
  })

  it('apaga pendentes antigos, soltos e pessoais de conta excluída', async () => {
    const { h, avatar, certificate } = await withFiles()
    const attached = await h.upload.execute(actor(), {
      purpose: 'AVATAR',
      courseId: null,
      originalName: 'atual.jpg',
      content: JPEG,
    })
    h.store.files.set(attached.id, {
      ...h.store.files.get(attached.id)!,
      status: 'ATTACHED',
    })
    // Recente e pendente fica
    expect(await h.cleanup.execute()).toBe(0)

    h.clock.advance(25 * HOUR)
    // A foto atual continua; o avatar e o certificado pendentes saem
    expect(await h.cleanup.execute()).toBe(2)
    expect([...h.store.files.keys()]).toEqual([attached.id])
    expect(h.storage.objects.size).toBe(1)
    await expect(h.read.execute(null, avatar.id)).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    })
    expect(certificate.id).toBeDefined()

    // Conta excluída: a foto ligada some na próxima limpeza e já não sai
    h.store.files.set(attached.id, {
      ...h.store.files.get(attached.id)!,
      ownerId: null,
    })
    await expect(h.read.execute(null, attached.id)).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    })
    expect(await h.cleanup.execute()).toBe(1)
    expect(h.storage.objects.size).toBe(0)
  })
})
