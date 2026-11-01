import { deleteDB, openDB, type IDBPDatabase } from 'idb'

// Banco único do web. Até a v6 os filtros e as ferramentas ficavam num
// segundo banco (LEGACY_DB_NAME), que é migrado e apagado ao abrir a v7.
export const DB_NAME = 'UFCFlowDB'
export const DB_VERSION = 7
export const LEGACY_DB_NAME = 'ufc-flow-indexeddb'

export const STORES = {
  classes: 'schedules',
  userSchedules: 'user_schedules',
  userPreferences: 'user_preferences',
  academicCalendar: 'academic_calendar',
  ruMenus: 'ru_menus',
  filters: 'filters',
  tools: 'tools',
} as const

// Stores do banco antigo, chaveadas pelo slug do curso
const LEGACY_STORES = [STORES.filters, STORES.tools] as const

export async function openUfcFlowDb(): Promise<IDBPDatabase> {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _, transaction) {
      // Remove store antiga se existir (para migração)
      if (oldVersion < 2 && db.objectStoreNames.contains(STORES.classes)) {
        db.deleteObjectStore(STORES.classes)
      }

      if (!db.objectStoreNames.contains(STORES.classes)) {
        const store = db.createObjectStore(STORES.classes, {
          keyPath: 'id',
        })
        // Índices para facilitar buscas
        store.createIndex('courseId', 'courseId')
        store.createIndex('year', 'year')
        store.createIndex('semester', 'semester')
        store.createIndex('courseYear', ['courseId', 'year'])
        store.createIndex('courseSemester', ['courseId', 'year', 'semester'], {
          unique: true,
        })
      }

      // --- Stores de Agenda e Preferências ---
      const agendaStore = db.objectStoreNames.contains(STORES.userSchedules)
        ? transaction.objectStore(STORES.userSchedules)
        : db.createObjectStore(STORES.userSchedules, { keyPath: 'id' })

      // Adiciona índice courseId na versão 4
      if (!agendaStore.indexNames.contains('courseId')) {
        agendaStore.createIndex('courseId', 'courseId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.userPreferences)) {
        db.createObjectStore(STORES.userPreferences, { keyPath: 'key' })
      }

      // --- Store de Calendário (Versão 4) ---
      if (!db.objectStoreNames.contains(STORES.academicCalendar)) {
        // A chave será o ano (ex: 2026)
        db.createObjectStore(STORES.academicCalendar, { keyPath: 'year' })
      }

      // --- Store de Cardápio do RU (Versão 6) ---
      if (!db.objectStoreNames.contains(STORES.ruMenus)) {
        // A chave será id composta: campusId-date (ex: "9-2026-09-25")
        db.createObjectStore(STORES.ruMenus, { keyPath: 'id' })
      }

      // --- Filtros e ferramentas, vindos do banco antigo (Versão 7) ---
      for (const name of LEGACY_STORES) {
        if (!db.objectStoreNames.contains(name)) {
          // Chave externa: o slug do curso
          db.createObjectStore(name)
        }
      }
    },
    blocking() {
      // Outra aba quer atualizar o banco: libera a conexão desta
      db.close()
      dbPromise = null
    },
  })

  try {
    await migrateLegacyDatabase(db)
  } catch (error) {
    // O banco antigo fica intacto e a migração é tentada na próxima abertura
    console.error('Failed to migrate legacy IndexedDB:', error)
  }

  return db
}

let dbPromise: Promise<IDBPDatabase> | null = null

// Conexão compartilhada pelo app
export function getUfcFlowDb(): Promise<IDBPDatabase> {
  dbPromise ??= openUfcFlowDb().catch((error: unknown) => {
    dbPromise = null
    throw error
  })
  return dbPromise
}

async function openLegacyDatabase(): Promise<IDBPDatabase | null> {
  try {
    // Sem versão, abre o banco existente; se não existir, aborta a criação
    return await openDB(LEGACY_DB_NAME, undefined, {
      upgrade(_db, _oldVersion, _newVersion, transaction) {
        // O abort rejeita o done da transação; o erro já chega pelo openDB
        transaction.done.catch(() => {})
        transaction.abort()
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    throw error
  }
}

async function migrateLegacyDatabase(db: IDBPDatabase): Promise<void> {
  const legacy = await openLegacyDatabase()
  if (!legacy) return

  try {
    const stores = LEGACY_STORES.filter((name) =>
      legacy.objectStoreNames.contains(name),
    )

    const entries = await Promise.all(
      stores.map(async (name) => ({
        name,
        keys: await legacy.getAllKeys(name),
        values: await legacy.getAll(name),
      })),
    )

    if (stores.length > 0) {
      const tx = db.transaction(stores, 'readwrite')
      // Não sobrescreve o que já foi gravado no banco novo
      const writes = entries.flatMap(({ name, keys, values }) =>
        keys.map(async (key, index) => {
          const store = tx.objectStore(name)
          if ((await store.getKey(key)) === undefined) {
            await store.put(values[index], key)
          }
        }),
      )
      try {
        await Promise.all([...writes, tx.done])
      } catch (error) {
        // Desfaz o que já tinha sido copiado (se a transação ainda estiver ativa)
        try {
          tx.abort()
        } catch {}
        throw error
      }
    }
  } finally {
    legacy.close()
  }

  // Só apaga depois da cópia confirmada. Sem await: se uma aba antiga ainda
  // estiver com o banco aberto, a exclusão espera ela fechar sem travar o app.
  void deleteDB(LEGACY_DB_NAME).catch((error: unknown) => {
    console.error('Failed to delete legacy IndexedDB:', error)
  })
}
