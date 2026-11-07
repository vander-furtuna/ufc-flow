import type { PersonalDataExport } from '@ufc-flow/contracts'
import { NextResponse } from 'next/server'

import { userFetch } from '@/lib/auth/user-api'

// Download da exportação (LGPD). O navegador baixa direto daqui; o token fica
// no servidor, como em toda chamada à API.
export async function GET() {
  const result = await userFetch<PersonalDataExport>('/v1/me/export')
  if (!result.ok) {
    return NextResponse.json(result.problem, {
      status: result.problem.status,
      headers: { 'cache-control': 'no-store' },
    })
  }
  const day = result.data.exportedAt.slice(0, 10)
  return new NextResponse(JSON.stringify(result.data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="ufc-flow-dados-${day}.json"`,
      'cache-control': 'no-store',
    },
  })
}
