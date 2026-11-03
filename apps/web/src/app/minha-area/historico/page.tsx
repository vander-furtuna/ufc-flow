import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'

import { HistoryPage } from './history-page'

export const metadata: Metadata = {
  title: 'Histórico',
  robots: { index: false },
}

// Histórico por semestre (mockups Historico, Mobile-Historico e
// Mobile-Historico-Registro)
export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/entrar?next=/minha-area/historico')
  return <HistoryPage />
}
