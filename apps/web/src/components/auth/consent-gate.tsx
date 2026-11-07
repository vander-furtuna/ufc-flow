'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useSession } from '@/lib/auth/use-session'

// Páginas abertas mesmo com aceite pendente: os textos, a própria tela de
// aceite e a conta (para exportar ou excluir sem aceitar)
const OPEN_PATHS = [
  '/aceitar-termos',
  '/termos',
  '/privacidade',
  '/minha-area/conta',
]

export function consentRedirect(
  pending: readonly string[] | undefined,
  pathname: string,
): string | null {
  if (!pending?.length) return null
  if (
    OPEN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return null
  }
  return `/aceitar-termos?next=${encodeURIComponent(pathname)}`
}

// Quem aceitou uma versão antiga dos Termos ou da Política (D46) vai para a
// tela de novo aceite. O modo anônimo não passa por aqui.
export function ConsentGate() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: user } = useSession()
  const target = consentRedirect(user?.pendingConsents, pathname)

  useEffect(() => {
    if (target) router.replace(target)
  }, [router, target])

  return null
}
