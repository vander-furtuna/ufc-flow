import type { AcademicTerm, CourseDetail } from '@ufc-flow/contracts'
import type { Metadata } from 'next'

import { getCurrentUser } from '@/lib/auth/session'
import { adminPage } from '@/lib/catalog/admin-api'

import { PageHeader } from '../_components/page-header'
import { TermsManager } from './terms-manager'

export const metadata: Metadata = { title: 'Semestres e turmas' }

// Admin cadastra os semestres e marca o vigente; moderadores e admins
// disparam a coleta de turmas dos cursos que gerenciam
export default async function TermsPage() {
  const user = await getCurrentUser()
  const [terms, courses] = await Promise.all([
    adminPage<AcademicTerm[]>('/v1/terms', '/admin/semestres'),
    adminPage<CourseDetail[]>('/v1/manage/courses', '/admin/semestres'),
  ])
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Semestres e turmas"
        description="O semestre vigente define as turmas e as agendas do site. As turmas são coletadas do SIGAA a cada 6 horas."
      />
      <TermsManager
        initialTerms={terms}
        courses={courses.filter((course) => course.isActive)}
        isAdmin={user?.roles.includes('ADMIN') ?? false}
      />
    </div>
  )
}
