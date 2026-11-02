import type { SigaaCourse } from '@ufc-flow/academic-core'
import type { CurriculumImportV1 } from '@ufc-flow/contracts'

import type { ExtractionSummary } from './extraction'
import type { SendResult } from './flow-api'
import type { RecentSend } from './flow-store'

// Conversa entre o popup e o content script da aba do SIGAA
export type ContentMessage =
  { type: 'GET_SUMMARY' } | { type: 'OPEN_PANEL' } | { type: 'GET_JSON' }

export type SummaryResponse = {
  summary: ExtractionSummary
  exportable: boolean
} | null

export type JsonResponse = { json: string; fileName: string } | null

// Pedidos ao service worker, que fala com a API do Flow (o content script do
// SIGAA não pode, por causa do CORS da página)
export type BackgroundMessage =
  | { type: 'FLOW_SEND'; payload: CurriculumImportV1 }
  | { type: 'FLOW_SUBJECT_NAMES'; codes: string[] }
  | { type: 'FLOW_SIGAA_CATALOG' }
  | { type: 'FLOW_REFRESH_SENDS' }

export type BackgroundResponse = {
  FLOW_SEND: SendResult
  // Código -> nome no catálogo do Flow; null sem API
  FLOW_SUBJECT_NAMES: Record<string, string> | null
  FLOW_SIGAA_CATALOG: SigaaCourse[] | null
  FLOW_REFRESH_SENDS: RecentSend[]
}

export function askBackground<T extends BackgroundMessage>(
  message: T,
): Promise<BackgroundResponse[T['type']]> {
  return chrome.runtime.sendMessage(message)
}
