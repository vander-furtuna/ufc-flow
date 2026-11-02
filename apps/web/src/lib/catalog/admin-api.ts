import 'server-only'

import { notFound, redirect } from 'next/navigation'

import { userFetch } from '@/lib/auth/user-api'

// Chamada à API em nome de quem está logado (área /admin)
export const adminFetch = userFetch

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
