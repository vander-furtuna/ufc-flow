import { STORES, getUfcFlowDb } from '@/lib/ufc-flow-db'

// Na renderização no servidor não há IndexedDB
const hasIndexedDB = () => typeof indexedDB !== 'undefined'

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
  if (!hasIndexedDB()) return null
  const db = await getUfcFlowDb()
  return ((await db.get(STORES.filters, courseSlug)) as SavedFilters) || null
}

export async function setFilters(
  courseSlug: string,
  filters: SavedFilters,
): Promise<void> {
  if (!hasIndexedDB()) return
  const db = await getUfcFlowDb()
  await db.put(STORES.filters, filters, courseSlug)
}

export async function getTools(courseSlug: string): Promise<SavedTools | null> {
  if (!hasIndexedDB()) return null
  const db = await getUfcFlowDb()
  return ((await db.get(STORES.tools, courseSlug)) as SavedTools) || null
}

export async function setTools(
  courseSlug: string,
  tools: SavedTools,
): Promise<void> {
  if (!hasIndexedDB()) return
  const db = await getUfcFlowDb()
  await db.put(STORES.tools, tools, courseSlug)
}
