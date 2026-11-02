import 'server-only'

import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { callApi, type ApiResult } from '@/lib/auth/api'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'
import { clientContext } from '@/lib/auth/session'

// Chamada à API em nome de quem está logado (área /admin)
export async function adminFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value
  return callApi<T>(path, { ...init, accessToken, ...(await clientContext()) })
}

// Para páginas: sem sessão vai para o login, recurso inexistente ou sem
// permissão vira 404, e o resto (API fora do ar) vira erro da página
export async function adminPage<T>(path: string, next: string): Promise<T> {
  const result = await adminFetch<T>(path)
  if (result.ok) return result.data
  const { status } = result.problem
  if (status === 401) redirect(`/entrar?next=${encodeURIComponent(next)}`)
  if (status === 403 || status === 404) notFound()
  throw new Error(result.problem.detail ?? 'Não foi possível falar com a API')
}
