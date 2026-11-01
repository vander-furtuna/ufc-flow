import type { ExtractionSummary } from './extraction'

// Conversa entre o popup e o content script da aba do SIGAA
export type ContentMessage =
  { type: 'GET_SUMMARY' } | { type: 'OPEN_PANEL' } | { type: 'GET_JSON' }

export type SummaryResponse = {
  summary: ExtractionSummary
  exportable: boolean
} | null

export type JsonResponse = { json: string; fileName: string } | null
