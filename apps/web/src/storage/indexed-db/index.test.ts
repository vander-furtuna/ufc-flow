import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { openDB } from 'idb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SavedFilters, SavedTools } from '.'

const filters: SavedFilters = {
  queryFilter: 'cálculo',
  durationFilter: [64],
  branchFilter: [],
  natureFilter: [],
  semesterFilter: [1],
}
const tools: SavedTools = {
  groupBy: 'branch',
  availability: 'all',
  highlightUnavailable: false,
}

// A conexão é guardada no módulo; cada teste importa uma cópia nova
async function importStorage() {
  vi.resetModules()
  return import('.')
}

describe('storage/indexed-db', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('grava filtros e ferramentas no UFCFlowDB', async () => {
    const storage = await importStorage()

    await storage.setFilters('psicologia', filters)
    await storage.setTools('psicologia', tools)

    expect(await storage.getFilters('psicologia')).toEqual(filters)
    expect(await storage.getTools('psicologia')).toEqual(tools)
    expect(await storage.getFilters('engenharia-de-computacao')).toBeNull()

    const { DB_NAME } = await import('@/lib/ufc-flow-db')
    const databases = await indexedDB.databases()
    expect(databases.map((db) => db.name)).toEqual([DB_NAME])

    const db = await openDB(DB_NAME)
    expect(await db.get('filters', 'psicologia')).toEqual(filters)
    db.close()
  })

  it('não quebra sem IndexedDB (renderização no servidor)', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const storage = await importStorage()

    expect(await storage.getFilters('psicologia')).toBeNull()
    expect(await storage.getTools('psicologia')).toBeNull()
    await expect(storage.setFilters('psicologia', filters)).resolves.toBe(
      undefined,
    )
    await expect(storage.setTools('psicologia', tools)).resolves.toBe(undefined)
  })
})
