import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'

import { SchedulesPage } from './schedules-page'

export const metadata: Metadata = {
  title: 'Agendas',
  robots: { index: false },
}

export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/entrar?next=/minha-area/agendas')
  return <SchedulesPage />
}
