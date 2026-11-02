import type { ManagedCurriculum } from '@ufc-flow/contracts'
import type { Metadata } from 'next'

import { getCurrentUser } from '@/lib/auth/session'
import { adminPage } from '@/lib/catalog/admin-api'

import { CurriculumEditor } from './curriculum-editor'

export const metadata: Metadata = { title: 'Editor da estrutura' }

export default async function CurriculumEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const path = `/admin/estruturas/${id}`
  const [managed, user] = await Promise.all([
    adminPage<ManagedCurriculum>(
      `/v1/manage/curricula/${encodeURIComponent(id)}`,
      path,
    ),
    getCurrentUser(),
  ])
  return (
    <CurriculumEditor
      initial={managed}
      isAdmin={user?.roles.includes('ADMIN') ?? false}
    />
  )
}
