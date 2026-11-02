import type { CursorPage, CurriculumImportView } from '@ufc-flow/contracts'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { SimplePage } from '@/components/simple-page'
import { adminFetch } from '@/lib/catalog/admin-api'
import { getCurrentUser } from '@/lib/auth/session'

import { AdminShell } from './admin-shell'

export const metadata: Metadata = {
  title: { template: 'Administração | %s', default: 'Administração' },
  robots: { index: false },
}

// Área de moderadores e admins. O que cada um pode fazer a API decide; aqui
// só se barra quem não modera nada.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/entrar?next=/admin')
  const isAdmin = user.roles.includes('ADMIN')
  if (!isAdmin && user.moderatedCourses.length === 0) {
    return (
      <SimplePage
        title="Sem acesso à administração"
        subtitle="Esta área é de moderadores de curso e administradores."
      >
        <p className="text-muted-foreground">
          Para moderar um curso, peça a moderação a um administrador.
        </p>
      </SimplePage>
    )
  }

  const pending = await adminFetch<CursorPage<CurriculumImportView>>(
    '/v1/ingestion/curriculum-imports?status=RECEIVED&limit=100',
  )
  const role = isAdmin
    ? 'Admin'
    : `Moderação · ${user.moderatedCourses.map((course) => course.name).join(', ')}`

  return (
    <AdminShell
      role={role}
      isAdmin={isAdmin}
      pendingImports={pending.ok ? pending.data.items.length : 0}
    >
      {children}
    </AdminShell>
  )
}
