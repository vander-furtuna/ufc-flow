import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { API_URL } from '@/lib/auth/api'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'
import { clientContext } from '@/lib/auth/session'

const problem = (status: number, code: string, detail: string) =>
  NextResponse.json(
    {
      type: `https://flow.ufc.br/problems/${code}`,
      title: detail,
      status,
      code,
      detail,
    },
    { status, headers: { 'content-type': 'application/problem+json' } },
  )

// Upload pelo BFF: o navegador manda o multipart para cá e o servidor
// repassa à API com o token do cookie (os tokens nunca vão ao navegador)
export async function POST(request: Request) {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!accessToken) {
    return problem(
      401,
      'AUTHENTICATION_REQUIRED',
      'Entre na sua conta para continuar',
    )
  }
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return problem(400, 'BAD_REQUEST', 'Envie o arquivo em multipart/form-data')
  }
  const { clientIp, userAgent } = await clientContext()
  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    accept: 'application/json',
  }
  if (clientIp) headers['x-forwarded-for'] = clientIp
  if (userAgent) headers['user-agent'] = userAgent

  let response: Response
  try {
    response = await fetch(`${API_URL}/v1/files`, {
      method: 'POST',
      headers,
      body: form,
      cache: 'no-store',
    })
  } catch {
    return problem(
      503,
      'API_UNAVAILABLE',
      'Não foi possível falar com o servidor agora.',
    )
  }
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      'content-type':
        response.headers.get('content-type') ?? 'application/json',
    },
  })
}
