import type { Metadata } from 'next'

import { SimplePage } from '@/components/simple-page'
import { getCurrentUser } from '@/lib/auth/session'

import { CriteriaManager } from './criteria-manager'

export const metadata: Metadata = { title: 'Critérios de avaliação' }

// Só admin gerencia os critérios (Matriz de permissões)
export default async function Page() {
  const user = await getCurrentUser()
  if (!user?.roles.includes('ADMIN')) {
    return (
      <SimplePage
        title="Sem acesso"
        subtitle="Só admins gerenciam os critérios de avaliação."
      >
        <p className="text-muted-foreground">
          A moderação cuida do curso; os critérios valem para todas as
          disciplinas.
        </p>
      </SimplePage>
    )
  }
  return <CriteriaManager />
}
