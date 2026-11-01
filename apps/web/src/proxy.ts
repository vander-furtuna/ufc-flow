import type { AuthTokens } from '@ufc-flow/contracts'
import { NextRequest, NextResponse } from 'next/server'

import { callApi } from '@/lib/auth/api'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  sessionCookies,
} from '@/lib/auth/cookies'

// 1️⃣ Redirecionamento para um caminho específico
function redirectToEng(request: NextRequest): NextResponse | undefined {
  const slugCookie = request.cookies.get('meu_cookie_slug')
  const slug = slugCookie?.value

  const { pathname } = request.nextUrl

  if (pathname === '/') {
    const urlDestino = slug
      ? new URL(`${slug}`, request.url)
      : new URL(`/cursos`, request.url)

    return NextResponse.redirect(urlDestino)
  }

  return undefined
}

// 2️⃣ Injeção de headers com caminho e URL completos
function injectCurrentUrlHeaders(request: NextRequest): NextResponse {
  const headers = new Headers()
  headers.set('x-current-path', request.nextUrl.pathname)
  headers.set('x-current-url', request.url)
  // Os cabeçalhos da requisição seguem adiante (com os cookies da sessão
  // renovada); os x-current-* vão na resposta, como antes
  return NextResponse.next({ request: { headers: request.headers }, headers })
}

type CookieChange =
  | { kind: 'set'; cookies: ReturnType<typeof sessionCookies> }
  | { kind: 'clear' }
  | null

// 3️⃣ Sessão: com o access token vencido e o refresh token presente, renova
// antes de a página rodar. Prefetch não renova, para não disputar o mesmo
// refresh token com a navegação.
async function renewSession(request: NextRequest): Promise<CookieChange> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  if (!refreshToken || request.cookies.has(ACCESS_COOKIE)) return null
  if (request.headers.get('next-router-prefetch')) return null

  const result = await callApi<AuthTokens>('/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: request.headers.get('user-agent'),
  })
  if (result.ok) return { kind: 'set', cookies: sessionCookies(result.data) }
  // Sessão inválida, expirada ou revogada: volta ao modo anônimo. Com a API
  // fora do ar, mantém os cookies e tenta de novo na próxima navegação.
  return result.problem.status === 401 || result.problem.status === 403
    ? { kind: 'clear' }
    : null
}

export async function proxy(request: NextRequest) {
  const change = await renewSession(request)

  // A página vê os cookies novos ainda nesta requisição
  if (change?.kind === 'set') {
    for (const cookie of change.cookies) {
      request.cookies.set(cookie.name, cookie.value)
    }
  } else if (change?.kind === 'clear') {
    request.cookies.delete(ACCESS_COOKIE)
    request.cookies.delete(REFRESH_COOKIE)
  }

  const response = redirectToEng(request) ?? injectCurrentUrlHeaders(request)

  if (change?.kind === 'set') {
    for (const { name, value, ...options } of change.cookies) {
      response.cookies.set(name, value, options)
    }
  } else if (change?.kind === 'clear') {
    response.cookies.delete(ACCESS_COOKIE)
    response.cookies.delete(REFRESH_COOKIE)
  }
  return response
}

// Rotas de API ficam de fora, menos /api/auth (o menu do usuário lê a
// sessão por lá e também precisa da renovação)
export const config = {
  matcher: [
    '/((?!api(?!/auth)|_next/static|_next/image|favicon.ico|icon.svg|banner.jpg).*)',
  ],
}
