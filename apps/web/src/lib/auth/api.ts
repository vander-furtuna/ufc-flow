import 'server-only'

import type { ProblemDetails } from '@ufc-flow/contracts'

// O web é BFF: só o servidor fala com a API, e os tokens ficam em cookies
// httpOnly (modelagem, Autenticação)
export const API_URL = process.env.API_URL ?? 'http://localhost:3333'

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; problem: ProblemDetails }

const unavailable = (detail: string): ProblemDetails => ({
  type: 'https://flow.ufc.br/problems/api-unavailable',
  title: 'Serviço indisponível',
  status: 503,
  code: 'API_UNAVAILABLE',
  detail,
})

// Repassa o IP do usuário: o limite de tentativas da API conta por IP
export async function callApi<T>(
  path: string,
  init: {
    method?: string
    body?: unknown
    accessToken?: string
    clientIp?: string | null
    userAgent?: string | null
  } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (init.body !== undefined) headers['content-type'] = 'application/json'
  if (init.accessToken) headers.authorization = `Bearer ${init.accessToken}`
  if (init.clientIp) headers['x-forwarded-for'] = init.clientIp
  if (init.userAgent) headers['user-agent'] = init.userAgent

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    })
  } catch {
    return {
      ok: false,
      problem: unavailable('Não foi possível falar com o servidor agora.'),
    }
  }

  if (response.status === 204) return { ok: true, data: undefined as T }
  const payload: unknown = await response.json().catch(() => null)
  if (response.ok) return { ok: true, data: payload as T }
  const problem = payload as ProblemDetails | null
  return {
    ok: false,
    problem:
      problem && typeof problem.code === 'string'
        ? problem
        : unavailable('O servidor respondeu de um jeito inesperado.'),
  }
}
