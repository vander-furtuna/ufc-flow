import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'

import { HoursPage } from './hours-page'

export const metadata: Metadata = {
  title: 'Horas complementares',
  robots: { index: false },
}

// Atividades complementares e de extensão, com certificado (fase 9)
export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/entrar?next=/minha-area/horas')
  return <HoursPage />
}
