import type { SigaaCourse } from '@ufc-flow/academic-core'
import type { CurriculumImportView } from '@ufc-flow/contracts'

// O que a extensão guarda em chrome.storage.local além da sessão: os envios
// recentes (popup) e o catálogo de cursos do SIGAA lido da API

export type RecentSend = {
  importId: string
  courseName: string
  sigaaId: string
  code: string
  status: CurriculumImportView['status']
  pendingReason: CurriculumImportView['pendingReason']
  curriculumId: string | null
  reviewPointCount: number
  sentAt: string
}

export interface ValueStore<T> {
  get(): Promise<T | null>
  set(value: T): Promise<void>
}

export const MAX_RECENT_SENDS = 10

const toRecent = (view: CurriculumImportView, sentAt: string): RecentSend => ({
  importId: view.id,
  courseName: view.course.name,
  sigaaId: view.course.sigaaId,
  code: view.curriculum.code,
  status: view.status,
  pendingReason: view.pendingReason,
  curriculumId: view.curriculum.id,
  reviewPointCount: view.reviewPointCount,
  sentAt,
})

// O mais novo primeiro, sem repetir a mesma importação
export async function recordSend(
  store: ValueStore<RecentSend[]>,
  view: CurriculumImportView,
  now: Date,
): Promise<RecentSend[]> {
  const current = (await store.get()) ?? []
  const next = [
    toRecent(view, now.toISOString()),
    ...current.filter((item) => item.importId !== view.id),
  ].slice(0, MAX_RECENT_SENDS)
  await store.set(next)
  return next
}

// Atualiza o que ainda espera (curso a criar, diff a aplicar)
export async function refreshSends(
  store: ValueStore<RecentSend[]>,
  getImport: (id: string) => Promise<CurriculumImportView | null>,
): Promise<RecentSend[]> {
  const current = (await store.get()) ?? []
  const next = await Promise.all(
    current.map(async (item) => {
      if (item.status !== 'RECEIVED') return item
      const view = await getImport(item.importId)
      return view ? toRecent(view, item.sentAt) : item
    }),
  )
  await store.set(next)
  return next
}

export type SendTone = 'success' | 'waiting' | 'muted'

export function describeSend(send: RecentSend): {
  tone: SendTone
  label: string
} {
  if (send.status === 'APPLIED') {
    return send.reviewPointCount > 0
      ? {
          tone: 'success',
          label: `Rascunho · ${send.reviewPointCount} para revisar`,
        }
      : { tone: 'success', label: 'Rascunho criado' }
  }
  if (send.status === 'RECEIVED') {
    return send.pendingReason === 'COURSE_MISSING'
      ? { tone: 'waiting', label: 'Aguardando o curso' }
      : { tone: 'waiting', label: 'Diferenças para conferir' }
  }
  return {
    tone: 'muted',
    label: send.status === 'DISCARDED' ? 'Descartado' : 'Falhou',
  }
}

type CachedCatalog = { fetchedAt: string; courses: SigaaCourse[] }

const DAY = 24 * 60 * 60 * 1000

// Catálogo da API com cache de um dia; sem API, fica o último guardado (e,
// sem nenhum, o content script usa o JSON embutido)
export async function cachedSigaaCatalog(
  store: ValueStore<CachedCatalog>,
  fetchFresh: () => Promise<SigaaCourse[] | null>,
  now: Date,
): Promise<SigaaCourse[] | null> {
  const cached = await store.get()
  if (cached && now.getTime() - Date.parse(cached.fetchedAt) < DAY) {
    return cached.courses
  }
  const fresh = await fetchFresh()
  if (!fresh) return cached?.courses ?? null
  await store.set({ fetchedAt: now.toISOString(), courses: fresh })
  return fresh
}

// Disciplinas com nome diferente do catálogo do Flow: viram ponto para
// revisar no editor, então a aba Revisar avisa antes
export function nameMismatches(
  subjects: readonly { code: string; name: string }[],
  flowNames: ReadonlyMap<string, string>,
): { code: string; sigaaName: string; flowName: string }[] {
  return subjects.flatMap((subject) => {
    const flowName = flowNames.get(subject.code)
    return flowName !== undefined && flowName !== subject.name
      ? [{ code: subject.code, sigaaName: subject.name, flowName }]
      : []
  })
}

export function chromeValueStore<T>(key: string): ValueStore<T> {
  return {
    async get() {
      const stored = await chrome.storage.local.get(key)
      return (stored[key] as T | undefined) ?? null
    },
    set: (value) => chrome.storage.local.set({ [key]: value }),
  }
}
