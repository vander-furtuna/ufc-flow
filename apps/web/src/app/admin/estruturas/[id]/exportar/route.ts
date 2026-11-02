import type { CurriculumImportV1 } from '@ufc-flow/contracts'
import { NextResponse } from 'next/server'

import { adminFetch } from '@/lib/catalog/admin-api'

const fileName = (data: CurriculumImportV1) =>
  `${data.course.name}-${data.curriculum.code}`
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Botão "Exportar JSON": baixa a EC no formato CurriculumImportV1
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await adminFetch<CurriculumImportV1>(
    `/v1/manage/curricula/${encodeURIComponent(id)}/export`,
  )
  if (!result.ok) {
    return NextResponse.json(result.problem, { status: result.problem.status })
  }
  return new Response(JSON.stringify(result.data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${fileName(result.data)}.json"`,
      'cache-control': 'private, no-store',
    },
  })
}
