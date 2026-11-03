import type { ParsedPostInput } from '@ufc-flow/contracts'
import { describe, expect, it } from 'vitest'

import type { Actor } from '../../../shared/domain/access-policy'
import { DomainError } from '../../../shared/domain/domain-error'
import {
  SequentialIds,
  SteppingClock,
} from '../../catalog/application/testing/in-memory-catalog'
import type { FileRecord } from '../../files/domain/file'
import {
  GetHubDeadlinesUseCase,
  GetHubFeedUseCase,
  GetPostUseCase,
  HubReadsUseCase,
  SavePostUseCase,
} from './hub.use-cases'
import { InMemoryHub } from './testing/in-memory-hub'

const actor = (overrides: Partial<Actor> = {}): Actor => ({
  userId: 'u-mod',
  isAdmin: false,
  moderatedCourseIds: new Set(['c-eng']),
  enrolledCourseIds: new Set(),
  ...overrides,
})
const MOD = actor()
const ADMIN = actor({
  userId: 'u-admin',
  isAdmin: true,
  moderatedCourseIds: new Set(),
})
const STUDENT = actor({ userId: 'u-ana', moderatedCourseIds: new Set() })
const ANON = actor({ userId: null, moderatedCourseIds: new Set() })

const input = (overrides: Partial<ParsedPostInput> = {}): ParsedPostInput =>
  ({
    type: 'NEWS',
    title: 'Laboratório recebe novos kits',
    summary: 'Kits para Microprocessadores',
    bodyMd: 'Os kits ficam disponíveis em dezembro.',
    coverFileId: null,
    imageFileIds: [],
    externalUrl: null,
    status: 'PUBLISHED',
    pinned: false,
    startsAt: null,
    endsAt: null,
    deadlineAt: null,
    location: null,
    attributes: {},
    ...overrides,
  }) as ParsedPostInput

const image = (
  id: string,
  overrides: Partial<FileRecord> = {},
): FileRecord => ({
  id,
  ownerId: 'u-mod',
  courseId: 'c-eng',
  purpose: 'POST_COVER',
  visibility: 'PUBLIC',
  storageKey: `k/${id}`,
  originalName: 'capa.webp',
  mimeType: 'image/webp',
  sizeBytes: 100,
  width: 10,
  height: 10,
  sha256: 'x',
  status: 'PENDING',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  attachedAt: null,
  deletedAt: null,
  ...overrides,
})

function harness() {
  const store = new InMemoryHub()
  const clock = new SteppingClock('2026-11-02T12:00:00.000Z')
  const ids = new SequentialIds()
  store.courses = [
    { id: 'c-eng', slug: 'eng', isActive: true },
    { id: 'c-cc', slug: 'cc', isActive: true },
  ]
  store.names.set('u-mod', 'Moderadora')
  return {
    store,
    clock,
    feed: new GetHubFeedUseCase(store, clock),
    get: new GetPostUseCase(store, clock),
    deadlines: new GetHubDeadlinesUseCase(store, clock),
    save: new SavePostUseCase(store, clock, ids),
    reads: new HubReadsUseCase(store, clock),
  }
}

async function rejects(work: Promise<unknown>) {
  try {
    await work
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  throw new Error('esperava um DomainError')
}

describe('posts do hub', () => {
  it('moderador publica no curso; aluno e anônimo não', async () => {
    const h = harness()
    const post = await h.save.create(MOD, 'eng', input())
    expect(post).toMatchObject({
      courseId: 'c-eng',
      slug: 'laboratorio-recebe-novos-kits',
      status: 'PUBLISHED',
      author: { id: 'u-mod', name: 'Moderadora' },
      closed: false,
    })
    expect(post.publishedAt).not.toBeNull()
    // Mesmo título no mesmo curso ganha sufixo; em outro curso, não
    expect((await h.save.create(MOD, 'eng', input())).slug).toBe(
      'laboratorio-recebe-novos-kits-2',
    )
    expect(await rejects(h.save.create(STUDENT, 'eng', input()))).toBe(
      'ACCESS_DENIED',
    )
    expect(await rejects(h.save.create(MOD, 'cc', input()))).toBe(
      'ACCESS_DENIED',
    )
    expect(await rejects(h.save.create(MOD, 'nada', input()))).toBe(
      'COURSE_NOT_FOUND',
    )
  })

  it('institucional só para admin e aparece em todos os cursos', async () => {
    const h = harness()
    expect(await rejects(h.save.create(MOD, null, input()))).toBe(
      'POST_INSTITUTIONAL_ADMIN_ONLY',
    )
    const post = await h.save.create(ADMIN, null, input({ title: 'Recesso' }))
    expect(post.courseId).toBeNull()
    for (const course of ['eng', 'cc']) {
      const feed = await h.feed.execute(ANON, course, {
        limit: 20,
        status: 'PUBLISHED',
      })
      expect(feed.items.map((item) => item.title)).toEqual(['Recesso'])
    }
    expect((await h.get.execute(ANON, 'cc', 'recesso')).title).toBe('Recesso')
  })

  it('feed: fixados à parte, por publicação, filtros e cursor', async () => {
    const h = harness()
    await h.save.create(MOD, 'eng', input({ title: 'Primeiro' }))
    await h.save.create(
      MOD,
      'eng',
      input({
        type: 'EVENT',
        title: 'Semana de Engenharia',
        startsAt: '2026-11-18T12:00:00.000Z',
        endsAt: '2026-11-22T12:00:00.000Z',
        attributes: { modality: 'IN_PERSON' },
      }),
    )
    await h.save.create(
      MOD,
      'eng',
      input({
        type: 'EVENT',
        title: 'Palestra passada',
        startsAt: '2026-10-01T12:00:00.000Z',
      }),
    )
    await h.save.create(MOD, 'eng', input({ title: 'Fixado', pinned: true }))
    await h.save.create(
      MOD,
      'eng',
      input({ title: 'Rascunho', status: 'DRAFT' }),
    )

    const first = await h.feed.execute(ANON, 'eng', {
      limit: 2,
      status: 'PUBLISHED',
    })
    expect(first.pinned.map((item) => item.title)).toEqual(['Fixado'])
    expect(first.items.map((item) => item.title)).toEqual([
      'Palestra passada',
      'Semana de Engenharia',
    ])
    const second = await h.feed.execute(ANON, 'eng', {
      limit: 2,
      status: 'PUBLISHED',
      cursor: first.nextCursor!,
    })
    expect(second.pinned).toEqual([])
    expect(second.items.map((item) => item.title)).toEqual(['Primeiro'])
    expect(second.nextCursor).toBeNull()

    const upcoming = await h.feed.execute(ANON, 'eng', {
      limit: 20,
      status: 'PUBLISHED',
      type: 'EVENT',
      upcoming: true,
    })
    expect(upcoming.items.map((item) => item.title)).toEqual([
      'Semana de Engenharia',
    ])
    const search = await h.feed.execute(ANON, 'eng', {
      limit: 20,
      status: 'PUBLISHED',
      q: 'SEMANA',
    })
    expect(search.items.map((item) => item.title)).toEqual([
      'Semana de Engenharia',
    ])

    // Rascunhos só para quem modera
    expect(
      await rejects(
        h.feed.execute(STUDENT, 'eng', { limit: 20, status: 'DRAFT' }),
      ),
    ).toBe('ACCESS_DENIED')
    const drafts = await h.feed.execute(MOD, 'eng', {
      limit: 20,
      status: 'DRAFT',
    })
    expect(drafts.items.map((item) => item.title)).toEqual(['Rascunho'])
    expect(await rejects(h.get.execute(STUDENT, 'eng', 'rascunho'))).toBe(
      'POST_NOT_FOUND',
    )
    expect((await h.get.execute(MOD, 'eng', 'rascunho')).status).toBe('DRAFT')
  })

  it('prazos: bolsas e editais abertos e eventos futuros', async () => {
    const h = harness()
    await h.save.create(
      MOD,
      'eng',
      input({
        type: 'CALL',
        title: 'Monitoria',
        deadlineAt: '2026-11-14T23:59:00.000Z',
        attributes: { number: '12/2026' },
      }),
    )
    await h.save.create(
      MOD,
      'eng',
      input({
        type: 'SCHOLARSHIP',
        title: 'Bolsa encerrada',
        deadlineAt: '2026-10-20T23:59:00.000Z',
      }),
    )
    await h.save.create(
      MOD,
      'eng',
      input({
        type: 'EVENT',
        title: 'Semana',
        startsAt: '2026-11-07T12:00:00.000Z',
      }),
    )
    const deadlines = await h.deadlines.execute('eng')
    expect(deadlines.map((item) => [item.title, item.at])).toEqual([
      ['Semana', '2026-11-07T12:00:00.000Z'],
      ['Monitoria', '2026-11-14T23:59:00.000Z'],
    ])
    const feed = await h.feed.execute(ANON, 'eng', {
      limit: 20,
      status: 'PUBLISHED',
    })
    expect(
      feed.items.find((item) => item.title === 'Bolsa encerrada')?.closed,
    ).toBe(true)
  })

  it('edita mantendo o slug, troca a capa e exclui soltando os arquivos', async () => {
    const h = harness()
    h.store.files.set('f-1', image('f-1'))
    h.store.files.set('f-2', image('f-2'))
    h.store.files.set('f-3', image('f-3', { purpose: 'POST_IMAGE' }))
    h.store.files.set('f-cc', image('f-cc', { courseId: 'c-cc' }))
    const post = await h.save.create(
      MOD,
      'eng',
      input({ coverFileId: 'f-1', imageFileIds: ['f-3'] }),
    )
    expect(h.store.files.get('f-1')?.status).toBe('ATTACHED')
    expect(h.store.files.get('f-3')?.status).toBe('ATTACHED')

    const edited = await h.save.update(
      MOD,
      post.id,
      input({
        title: 'Novo título',
        coverFileId: 'f-2',
        imageFileIds: ['f-3'],
      }),
    )
    expect(edited).toMatchObject({
      slug: post.slug,
      title: 'Novo título',
      coverFileId: 'f-2',
      imageFileIds: ['f-3'],
    })
    expect(h.store.files.get('f-1')?.deletedAt).not.toBeNull()

    // Capa de outro curso não serve
    expect(
      await rejects(
        h.save.update(MOD, post.id, input({ coverFileId: 'f-cc' })),
      ),
    ).toBe('FILE_NOT_FOUND')

    await h.save.remove(MOD, post.id)
    expect(h.store.files.get('f-2')?.deletedAt).not.toBeNull()
    expect(h.store.files.get('f-3')?.deletedAt).not.toBeNull()
    expect(await rejects(h.get.execute(ANON, 'eng', post.slug))).toBe(
      'POST_NOT_FOUND',
    )
    expect(await rejects(h.save.remove(MOD, post.id))).toBe('POST_NOT_FOUND')
  })

  it('novidades: últimos 7 dias sem visita, depois desde a última', async () => {
    const h = harness()
    await h.save.create(MOD, 'eng', input({ title: 'Um' }))
    await h.save.create(ADMIN, null, input({ title: 'Institucional' }))
    expect(await h.reads.unread('u-ana', 'eng')).toEqual({ count: 2 })
    await h.reads.markRead('u-ana', 'eng')
    expect(await h.reads.unread('u-ana', 'eng')).toEqual({ count: 0 })
    await h.save.create(MOD, 'eng', input({ title: 'Dois' }))
    await h.save.create(
      MOD,
      'eng',
      input({ title: 'Rascunho', status: 'DRAFT' }),
    )
    expect(await h.reads.unread('u-ana', 'eng')).toEqual({ count: 1 })
  })
})
