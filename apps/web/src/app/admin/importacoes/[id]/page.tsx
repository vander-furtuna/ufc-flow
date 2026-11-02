import type { CurriculumImportDetail } from '@ufc-flow/contracts'
import type { Metadata } from 'next'

import { getCurrentUser } from '@/lib/auth/session'
import { adminPage } from '@/lib/catalog/admin-api'

import { ImportDetail } from './import-detail'

export const metadata: Metadata = { title: 'Importação' }

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [detail, user] = await Promise.all([
    adminPage<CurriculumImportDetail>(
      `/v1/ingestion/curriculum-imports/${encodeURIComponent(id)}`,
      `/admin/importacoes/${id}`,
    ),
    getCurrentUser(),
  ])
  return (
    <ImportDetail
      initial={detail}
      isAdmin={user?.roles.includes('ADMIN') ?? false}
    />
  )
}
