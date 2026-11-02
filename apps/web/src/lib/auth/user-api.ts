import 'server-only'

import { cookies } from 'next/headers'

import { callApi, type ApiResult } from './api'
import { ACCESS_COOKIE } from './cookies'
import { clientContext } from './session'

// Chamada à API em nome de quem está logado, com o token do cookie
export async function userFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value
  return callApi<T>(path, { ...init, accessToken, ...(await clientContext()) })
}
