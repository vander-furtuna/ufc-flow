// Login e envio ao Flow (D41). Ligada nos .env desde a fase 5; desligada,
// só o download do JSON funciona.
export const FLOW_SYNC_ENABLED = process.env.PLASMO_PUBLIC_FLOW_SYNC === 'true'

export const SIGAA_CURRICULA_URL =
  'https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf'

// Web do Flow, para criar conta e abrir o editor depois do envio
export const FLOW_URL =
  process.env.PLASMO_PUBLIC_FLOW_WEB_URL ?? 'http://localhost:3000'

// Telas do /admin do web (PR 5.3)
export const editorUrl = (curriculumId: string) =>
  `${FLOW_URL}/admin/estruturas/${curriculumId}`

export const importUrl = (importId: string) =>
  `${FLOW_URL}/admin/importacoes/${importId}`

// API do Flow. Vem de .env.development/.env.production; a mesma URL entra
// nas host_permissions do manifesto
export const FLOW_API_URL =
  process.env.PLASMO_PUBLIC_FLOW_API_URL ?? 'http://localhost:3333'
