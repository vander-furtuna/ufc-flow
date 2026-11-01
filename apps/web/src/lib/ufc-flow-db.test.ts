import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { openDB, type IDBPDatabase } from 'idb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DB_NAME,
  DB_VERSION,
  LEGACY_DB_NAME,
  STORES,
  openUfcFlowDb,
} from './ufc-flow-db'

const filtersA = {
  queryFilter: 'cálculo',
  durationFilter: [64],
  branchFilter: [],
  natureFilter: ['OBRIGATORIA'],
  semesterFilter: [1, 2],
}
const filtersB = { ...filtersA, queryFilter: '' }
const toolsA = {
  groupBy: 'semester',
  availability: 'available',
  highlightUnavailable: true,
}

const schedule = {
  id: '0b8f4c7e-1f7a-4a39-9d55-5d1f7e3c2a10',
  name: 'Meu Cronograma',
  courseId: '2006.2',
  courseSlug: 'engenharia-de-computacao',
  curriculumSlug: '2006-2',
  year: 2026,
  semester: 2,
  createdAt: 1,
  updatedAt: 2,
  classes: [],
}

// Esquema do UFCFlowDB v6, como estava antes da unificação
async function createV6Database() {
  const db = await openDB(DB_NAME, 6, {
    upgrade(db) {
      const classes = db.createObjectStore('schedules', { keyPath: 'id' })
      classes.createIndex('courseId', 'courseId')
      classes.createIndex('courseSemester', ['courseId', 'year', 'semester'], {
        unique: true,
      })
      const schedules = db.createObjectStore('user_schedules', {
        keyPath: 'id',
      })
      schedules.createIndex('courseId', 'courseId', { unique: false })
      db.createObjectStore('user_preferences', { keyPath: 'key' })
      db.createObjectStore('academic_calendar', { keyPath: 'year' })
      db.createObjectStore('ru_menus', { keyPath: 'id' })
    },
  })
  await db.put('user_schedules', schedule)
  await db.put('user_preferences', {
    key: 'completedSubjects',
    value: ['CK0211'],
  })
  await db.put('academic_calendar', { year: 2026, data: [] })
  await db.put('ru_menus', { id: '9-2026-09-25', items: [] })
  db.close()
}

// Banco antigo de filtros e ferramentas (ufc-flow-indexeddb v1)
async function createLegacyDatabase(data: {
  filters?: Record<string, unknown>
  tools?: Record<string, unknown>
}) {
  const db = await openDB(LEGACY_DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore('filters')
      db.createObjectStore('tools')
    },
  })
  for (const [key, value] of Object.entries(data.filters ?? {})) {
    await db.put('filters', value, key)
  }
  for (const [key, value] of Object.entries(data.tools ?? {})) {
    await db.put('tools', value, key)
  }
  db.close()
}

async function databaseNames() {
  const databases = await indexedDB.databases()
  return databases.map((db) => db.name)
}

async function expectLegacyDeleted() {
  await vi.waitFor(async () => {
    expect(await databaseNames()).not.toContain(LEGACY_DB_NAME)
  })
}

describe('openUfcFlowDb', () => {
  let db: IDBPDatabase | null = null

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  afterEach(() => {
    db?.close()
    db = null
    vi.restoreAllMocks()
  })

  it('cria o banco com todas as stores numa instalação nova', async () => {
    db = await openUfcFlowDb()

    expect(db.name).toBe(DB_NAME)
    expect(db.version).toBe(DB_VERSION)
    expect([...db.objectStoreNames].sort()).toEqual(
      Object.values(STORES).sort(),
    )
    expect(await databaseNames()).toEqual([DB_NAME])
  })

  it('mantém os dados do v6 ao atualizar', async () => {
    await createV6Database()

    db = await openUfcFlowDb()

    expect(await db.get(STORES.userSchedules, schedule.id)).toEqual(schedule)
    expect(await db.get(STORES.userPreferences, 'completedSubjects')).toEqual({
      key: 'completedSubjects',
      value: ['CK0211'],
    })
    expect(await db.get(STORES.academicCalendar, 2026)).toBeDefined()
    expect(await db.get(STORES.ruMenus, '9-2026-09-25')).toBeDefined()
    expect(
      db
        .transaction(STORES.classes)
        .store.indexNames.contains('courseSemester'),
    ).toBe(true)
  })

  it('copia filtros e ferramentas de todos os cursos e apaga o banco antigo', async () => {
    await createV6Database()
    await createLegacyDatabase({
      filters: { 'engenharia-de-computacao': filtersA, psicologia: filtersB },
      tools: { 'engenharia-de-computacao': toolsA },
    })

    db = await openUfcFlowDb()

    expect(await db.get(STORES.filters, 'engenharia-de-computacao')).toEqual(
      filtersA,
    )
    expect(await db.get(STORES.filters, 'psicologia')).toEqual(filtersB)
    expect(await db.get(STORES.tools, 'engenharia-de-computacao')).toEqual(
      toolsA,
    )
    expect(await db.get(STORES.userSchedules, schedule.id)).toEqual(schedule)
    await expectLegacyDeleted()
  })

  it('não cria o banco antigo quando ele não existe', async () => {
    await createV6Database()

    db = await openUfcFlowDb()

    expect(await databaseNames()).toEqual([DB_NAME])
  })

  it('não duplica nem sobrescreve ao migrar de novo', async () => {
    await createLegacyDatabase({ filters: { psicologia: filtersA } })
    db = await openUfcFlowDb()
    await expectLegacyDeleted()

    // O usuário mudou o filtro depois da migração
    await db.put(STORES.filters, filtersB, 'psicologia')
    db.close()

    // O banco antigo reaparece, por exemplo recriado por uma aba antiga
    await createLegacyDatabase({ filters: { psicologia: filtersA } })
    db = await openUfcFlowDb()

    expect(await db.getAllKeys(STORES.filters)).toEqual(['psicologia'])
    expect(await db.get(STORES.filters, 'psicologia')).toEqual(filtersB)
    await expectLegacyDeleted()
  })

  it('mantém o banco antigo se a cópia falhar e migra na próxima abertura', async () => {
    await createLegacyDatabase({ tools: { psicologia: toolsA } })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const put = vi
      .spyOn(IDBObjectStore.prototype, 'put')
      .mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

    db = await openUfcFlowDb()

    expect(error).toHaveBeenCalled()
    expect(await db.get(STORES.tools, 'psicologia')).toBeUndefined()
    expect(await databaseNames()).toContain(LEGACY_DB_NAME)

    put.mockRestore()
    db.close()
    db = await openUfcFlowDb()

    expect(await db.get(STORES.tools, 'psicologia')).toEqual(toolsA)
    await expectLegacyDeleted()
  })
})
