import type { SigaaCourse } from '@ufc-flow/academic-core'
import type { CurriculumImportView } from '@ufc-flow/contracts'
import { describe, expect, it, vi } from 'vitest'

import { importView } from './flow-api.test'
import {
  cachedSigaaCatalog,
  chromeValueStore,
  describeSend,
  MAX_RECENT_SENDS,
  nameMismatches,
  recordSend,
  refreshSends,
  type RecentSend,
  type ValueStore,
} from './flow-store'

const NOW = new Date('2026-11-01T12:00:00.000Z')

function memory<T>(initial: T | null = null) {
  let value = initial
  const store: ValueStore<T> = {
    get: async () => value,
    set: async (next) => {
      value = next
    },
  }
  return { store, current: () => value }
}

const id = (n: number) =>
  `0b6f9a54-3c1e-4c55-9d43-${String(n).padStart(12, '0')}`

describe('envios recentes', () => {
  it('guarda o mais novo primeiro, sem repetir e com limite', async () => {
    const { store, current } = memory<RecentSend[]>()
    for (let n = 1; n <= MAX_RECENT_SENDS + 2; n++) {
      await recordSend(store, importView({ id: id(n) }), NOW)
    }
    await recordSend(
      store,
      importView({ id: id(12), reviewPointCount: 0 }),
      NOW,
    )
    const list = current()!
    expect(list).toHaveLength(MAX_RECENT_SENDS)
    expect(list[0]).toMatchObject({
      importId: id(12),
      courseName: 'ENGENHARIA DE COMPUTAÇÃO',
      code: '2006.2',
      reviewPointCount: 0,
      sentAt: NOW.toISOString(),
    })
    expect(list.filter((item) => item.importId === id(12))).toHaveLength(1)
  })

  it('atualiza só o que ainda espera e mantém a data do envio', async () => {
    const { store, current } = memory<RecentSend[]>()
    await recordSend(store, importView({ id: id(1) }), NOW)
    await recordSend(
      store,
      importView({
        id: id(2),
        status: 'RECEIVED',
        pendingReason: 'COURSE_MISSING',
      }),
      NOW,
    )
    await recordSend(
      store,
      importView({
        id: id(3),
        status: 'RECEIVED',
        pendingReason: 'DIFF_REVIEW',
      }),
      NOW,
    )
    const getImport = vi.fn(
      async (importId: string): Promise<CurriculumImportView | null> =>
        importId === id(2) ? importView({ id: id(2) }) : null,
    )
    await refreshSends(store, getImport)
    expect(getImport).toHaveBeenCalledTimes(2)
    expect(current()!.map((item) => item.status)).toEqual([
      'RECEIVED',
      'APPLIED',
      'APPLIED',
    ])
    expect(current()![1]?.sentAt).toBe(NOW.toISOString())
    expect(await refreshSends(memory<RecentSend[]>().store, getImport)).toEqual(
      [],
    )
  })

  it.each([
    [
      { status: 'APPLIED', reviewPointCount: 2 },
      'success',
      'Rascunho · 2 para revisar',
    ],
    [{ status: 'APPLIED', reviewPointCount: 0 }, 'success', 'Rascunho criado'],
    [
      { status: 'RECEIVED', pendingReason: 'COURSE_MISSING' },
      'waiting',
      'Aguardando o curso',
    ],
    [
      { status: 'RECEIVED', pendingReason: 'DIFF_REVIEW' },
      'waiting',
      'Diferenças para conferir',
    ],
    [{ status: 'DISCARDED' }, 'muted', 'Descartado'],
    [{ status: 'FAILED' }, 'muted', 'Falhou'],
  ] as const)('%o → %s', (overrides, tone, label) => {
    const base: RecentSend = {
      importId: id(1),
      courseName: 'X',
      sigaaId: '1',
      code: '2006.2',
      status: 'APPLIED',
      pendingReason: null,
      curriculumId: null,
      reviewPointCount: 0,
      sentAt: NOW.toISOString(),
    }
    const send = { ...base, ...overrides } as RecentSend
    expect(describeSend(send)).toEqual({ tone, label })
  })
})

describe('cachedSigaaCatalog', () => {
  const course = (sigaaId: string): SigaaCourse => ({
    sigaaId,
    name: 'X',
    city: 'SOBRAL',
    modality: 'IN_PERSON',
    unitAcronym: null,
    unitName: null,
  })

  it('usa o cache de até um dia e depois busca de novo', async () => {
    const { store } = memory({
      fetchedAt: '2026-11-01T00:00:00.000Z',
      courses: [course('1')],
    })
    const fetchFresh = vi.fn(async () => [course('2')])
    expect(await cachedSigaaCatalog(store, fetchFresh, NOW)).toEqual([
      course('1'),
    ])
    expect(fetchFresh).not.toHaveBeenCalled()
    const tomorrow = new Date('2026-11-02T12:00:00.000Z')
    expect(await cachedSigaaCatalog(store, fetchFresh, tomorrow)).toEqual([
      course('2'),
    ])
  })

  it('sem API, fica o último guardado ou nada', async () => {
    const old = memory({
      fetchedAt: '2026-10-01T00:00:00.000Z',
      courses: [course('1')],
    })
    expect(await cachedSigaaCatalog(old.store, async () => null, NOW)).toEqual([
      course('1'),
    ])
    expect(
      await cachedSigaaCatalog(memory<never>().store, async () => null, NOW),
    ).toBeNull()
  })
})

describe('nameMismatches', () => {
  it('aponta nome diferente; código fora do Flow não conta', () => {
    expect(
      nameMismatches(
        [
          { code: 'SBL0074', name: 'FÍSICA GERAL I (TEORIA)' },
          { code: 'ECO0001', name: 'ALGORITMOS' },
          { code: 'ECO0099', name: 'NOVA' },
        ],
        new Map([
          ['SBL0074', 'FÍSICA GERAL I'],
          ['ECO0001', 'ALGORITMOS'],
        ]),
      ),
    ).toEqual([
      {
        code: 'SBL0074',
        sigaaName: 'FÍSICA GERAL I (TEORIA)',
        flowName: 'FÍSICA GERAL I',
      },
    ])
  })
})

describe('chromeValueStore', () => {
  it('lê e grava em chrome.storage.local', async () => {
    const data: Record<string, unknown> = {}
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => (key in data ? { [key]: data[key] } : {}),
          set: async (items: Record<string, unknown>) => {
            Object.assign(data, items)
          },
        },
      },
    })
    const store = chromeValueStore<number>('k')
    expect(await store.get()).toBeNull()
    await store.set(3)
    expect(await store.get()).toBe(3)
    vi.unstubAllGlobals()
  })
})
