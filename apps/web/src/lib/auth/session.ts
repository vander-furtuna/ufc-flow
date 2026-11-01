import 'server-only'

import type { AuthTokens, Me } from '@ufc-flow/contracts'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'

import { callApi } from './api'
import { ACCESS_COOKIE, REFRESH_COOKIE, sessionCookies } from './cookies'

export async function clientContext() {
  const list = await headers()
  return {
    clientIp: list.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: list.get('user-agent'),
  }
}

export async function saveSession(tokens: AuthTokens) {
  const store = await cookies()
  for (const { name, value, ...options } of sessionCookies(tokens)) {
    store.set(name, value, options)
  }
}

export async function clearSession() {
  const store = await cookies()
  store.delete(ACCESS_COOKIE)
  store.delete(REFRESH_COOKIE)
}

// Usuário da sessão atual, ou null no modo anônimo. O proxy.ts renova o
// access token antes de a página rodar; aqui ele só é lido.
export const getCurrentUser = cache(async (): Promise<Me | null> => {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!accessToken) return null
  const result = await callApi<Me>('/v1/me', { accessToken })
  return result.ok ? result.data : null
})

export async function getRefreshToken() {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null
}
