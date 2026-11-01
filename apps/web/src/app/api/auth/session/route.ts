import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth/session'

// Usuário da sessão para componentes do navegador (menu do header). Devolve
// só os dados públicos da conta; os tokens nunca saem do servidor.
export async function GET() {
  const user = await getCurrentUser()
  return NextResponse.json(
    { user },
    { headers: { 'cache-control': 'private, no-store' } },
  )
}
