import { openDB } from 'idb'

const DB_NAME = 'ufc-flow-indexeddb'
const DB_VERSION = 1

const isClient = typeof window !== 'undefined'

const dbPromise = isClient
  ? openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('filters')) {
          db.createObjectStore('filters')
        }
        if (!db.objectStoreNames.contains('tools')) {
          db.createObjectStore('tools')
        }
      },
    })
  : null

export interface SavedFilters {
  queryFilter: string
  durationFilter: number[]
  branchFilter: string[]
  natureFilter: string[]
  semesterFilter: number[]
}

export interface SavedTools {
  groupBy: 'semester' | 'branch' | 'nature' | 'duration'
  availability: 'all' | 'available' | 'unavailable'
  highlightUnavailable: boolean
}

export async function getFilters(
  courseSlug: string,
): Promise<SavedFilters | null> {
  if (!dbPromise) return null
  const db = await dbPromise
  return (await db.get('filters', courseSlug)) || null
}

export async function setFilters(
  courseSlug: string,
  filters: SavedFilters,
): Promise<void> {
  if (!dbPromise) return
  const db = await dbPromise
  await db.put('filters', filters, courseSlug)
}

export async function getTools(courseSlug: string): Promise<SavedTools | null> {
  if (!dbPromise) return null
  const db = await dbPromise
  return (await db.get('tools', courseSlug)) || null
}

export async function setTools(
  courseSlug: string,
  tools: SavedTools,
): Promise<void> {
  if (!dbPromise) return
  const db = await dbPromise
  await db.put('tools', tools, courseSlug)
}
