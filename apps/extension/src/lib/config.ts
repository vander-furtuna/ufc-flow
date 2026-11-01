// Login e envio ao Flow ficam atrás desta flag até a API existir: o login
// chega na fase 4 e o envio na fase 5 (D41). Desligada, só o download do
// JSON funciona.
export const FLOW_SYNC_ENABLED = process.env.PLASMO_PUBLIC_FLOW_SYNC === 'true'

export const SIGAA_CURRICULA_URL =
  'https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf'

export const FLOW_URL = 'https://flow.ufc.br'

// API do Flow. Vem de .env.development/.env.production; a mesma URL entra
// nas host_permissions do manifesto
export const FLOW_API_URL =
  process.env.PLASMO_PUBLIC_FLOW_API_URL ?? 'http://localhost:3333'
