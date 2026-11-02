import type { SigaaCourse } from '@ufc-flow/academic-core'

import { FLOW_API_URL } from './lib/config'
import { createFlowApi } from './lib/flow-api'
import { chromeSessionStore, createFlowClient } from './lib/flow-session'
import {
  cachedSigaaCatalog,
  chromeValueStore,
  recordSend,
  refreshSends,
  type RecentSend,
} from './lib/flow-store'
import type { BackgroundMessage, BackgroundResponse } from './lib/messages'

// Service worker: faz as chamadas à API do Flow para o painel no SIGAA e
// para o popup, e guarda os envios recentes e o catálogo do SIGAA
const client = createFlowClient({
  apiUrl: FLOW_API_URL,
  store: chromeSessionStore,
})
const api = createFlowApi({
  apiUrl: FLOW_API_URL,
  accessToken: () => client.accessToken(),
})
const recentSends = chromeValueStore<RecentSend[]>('ufc-flow:recent-sends')
const sigaaCatalog = chromeValueStore<{
  fetchedAt: string
  courses: SigaaCourse[]
}>('ufc-flow:sigaa-catalog')

async function handle(
  message: BackgroundMessage,
): Promise<BackgroundResponse[BackgroundMessage['type']]> {
  switch (message.type) {
    case 'FLOW_SEND': {
      const result = await api.sendCurriculum(message.payload)
      if (result.ok) await recordSend(recentSends, result.view, new Date())
      return result
    }
    case 'FLOW_SUBJECT_NAMES': {
      const names = await api.subjectNames(message.codes)
      return names ? Object.fromEntries(names) : null
    }
    case 'FLOW_SIGAA_CATALOG':
      return cachedSigaaCatalog(sigaaCatalog, api.sigaaCourses, new Date())
    case 'FLOW_REFRESH_SENDS':
      return refreshSends(recentSends, api.getImport)
  }
}

chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, _sender, sendResponse) => {
    if (!message?.type?.startsWith('FLOW_')) return false
    void handle(message).then(sendResponse)
    // Resposta assíncrona: mantém o canal aberto
    return true
  },
)
