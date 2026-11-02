import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'

import { NotificationsPage } from './notifications-page'

export const metadata: Metadata = {
  title: 'Notificações',
  robots: { index: false },
}

// Notificações da conta (mockup Mobile-Notificacoes). Sem login, vai para a
// tela de entrar e volta para cá.
export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/entrar?next=/notificacoes')
  return <NotificationsPage />
}
