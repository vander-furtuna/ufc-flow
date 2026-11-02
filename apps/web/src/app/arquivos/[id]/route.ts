import { cookies } from 'next/headers'

import { API_URL } from '@/lib/auth/api'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Cabeçalhos da API repassados ao navegador (cache imutável nos públicos)
const FORWARDED = [
  'content-type',
  'content-length',
  'cache-control',
  'content-disposition',
  'x-content-type-options',
]

// Entrega de arquivos pelo web: a API não fica exposta na internet. Arquivo
// privado (certificado) só sai para o dono, com o token do cookie.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID.test(id)) return new Response(null, { status: 404 })
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value
  let response: Response
  try {
    response = await fetch(`${API_URL}/v1/files/${id}`, {
      headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
      cache: 'no-store',
    })
  } catch {
    return new Response(null, { status: 503 })
  }
  if (!response.ok) {
    return new Response(null, {
      status: response.status === 404 ? 404 : 502,
      headers: { 'cache-control': 'no-store' },
    })
  }
  const headers = new Headers()
  for (const name of FORWARDED) {
    const value = response.headers.get(name)
    if (value) headers.set(name, value)
  }
  return new Response(response.body, { status: 200, headers })
}
