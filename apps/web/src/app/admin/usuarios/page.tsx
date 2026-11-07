import type { Metadata } from 'next'

import { SimplePage } from '@/components/simple-page'
import { getCurrentUser } from '@/lib/auth/session'

import { UsersManager } from './users-manager'

export const metadata: Metadata = { title: 'Usuários' }

// Só admin gerencia contas (Matriz de permissões)
export default async function Page() {
  const user = await getCurrentUser()
  if (!user?.roles.includes('ADMIN')) {
    return (
      <SimplePage title="Sem acesso" subtitle="Só admins gerenciam usuários.">
        <p className="text-muted-foreground">
          Moderadores cuidam do fórum do curso em Moderação.
        </p>
      </SimplePage>
    )
  }
  return <UsersManager currentUserId={user.id} />
}
