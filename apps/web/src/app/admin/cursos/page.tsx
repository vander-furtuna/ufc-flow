import type { CourseDetail, SigaaCourseEntry } from '@ufc-flow/contracts'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'
import { adminPage } from '@/lib/catalog/admin-api'

import { PageHeader } from '../_components/page-header'
import { CoursesManager } from './courses-manager'

export const metadata: Metadata = { title: 'Cursos' }

// Só admin cria, edita e exclui cursos (Matriz de permissões)
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ sigaa?: string }>
}) {
  const user = await getCurrentUser()
  if (!user?.roles.includes('ADMIN')) notFound()
  const { sigaa } = await searchParams
  const [courses, catalog] = await Promise.all([
    adminPage<CourseDetail[]>('/v1/manage/courses', '/admin/cursos'),
    adminPage<SigaaCourseEntry[]>('/v1/sigaa-courses', '/admin/cursos'),
  ])
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Cursos"
        description="Criar um curso no Flow é escolher um curso da lista pública do SIGAA."
      />
      <CoursesManager
        initialCourses={courses}
        catalog={catalog}
        preselectedSigaaId={sigaa ?? null}
      />
    </div>
  )
}
