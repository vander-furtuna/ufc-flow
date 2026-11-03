import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'

import { ProgressPage } from './progress-page'

export const metadata: Metadata = {
  title: 'Minha área',
  robots: { index: false },
}

// Painel do aluno (mockups Minha-Area e Mobile-Minha-Area). Sem login, vai
// para a tela de entrar e volta para cá.
export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/entrar?next=/minha-area')
  return <ProgressPage />
}
