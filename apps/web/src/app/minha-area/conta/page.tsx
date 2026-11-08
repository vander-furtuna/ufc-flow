import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import type { CourseSummary } from '@ufc-flow/contracts'

import { SimplePage } from '@/components/simple-page'
import { callApi } from '@/lib/auth/api'
import { getCurrentUser } from '@/lib/auth/session'

import { AccountSettings } from './account-settings'

export const metadata: Metadata = {
  title: 'Minha conta',
  robots: { index: false },
}

// Dados da conta, exportação e exclusão (LGPD). Sem mockup próprio: segue a
// casca das páginas simples.
export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/entrar?next=/minha-area/conta')
  // Cursos para o pedido de moderação (a lista pública da API)
  const courses = await callApi<CourseSummary[]>('/v1/courses')
  return (
    <SimplePage
      title="Minha conta"
      subtitle="Seus dados, os documentos que você aceitou e a exclusão da conta."
    >
      <AccountSettings user={user} courses={courses.ok ? courses.data : []} />
    </SimplePage>
  )
}
