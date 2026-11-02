'use client'

import type { Me } from '@ufc-flow/contracts'
import { useQuery } from '@tanstack/react-query'

export const SESSION_QUERY_KEY = ['auth', 'session'] as const

async function fetchSession(): Promise<Me | null> {
  const response = await fetch('/api/auth/session', { cache: 'no-store' })
  if (!response.ok) return null
  return ((await response.json()) as { user: Me | null }).user
}

// Usuário da sessão no navegador (null no modo anônimo). Os tokens ficam nos
// cookies httpOnly; aqui chegam só os dados públicos da conta.
export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 60_000,
  })
}
