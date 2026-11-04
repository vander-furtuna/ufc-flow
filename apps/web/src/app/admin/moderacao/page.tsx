import type { Metadata } from 'next'
import { Suspense } from 'react'

import { getCurrentUser } from '@/lib/auth/session'

import { ModerationPage } from './moderation-page'

export const metadata: Metadata = { title: 'Moderação' }

// O layout do admin já barra quem não modera nada
export default async function Page() {
  const user = await getCurrentUser()
  const isAdmin = Boolean(user?.roles.includes('ADMIN'))
  const scope = isAdmin
    ? 'todos os cursos'
    : (user?.moderatedCourses.map((course) => course.name).join(', ') ?? '')
  return (
    <Suspense>
      <ModerationPage isAdmin={isAdmin} scope={scope} />
    </Suspense>
  )
}
