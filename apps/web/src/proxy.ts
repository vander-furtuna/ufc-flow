// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

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

  return NextResponse.next()
}

// 2️⃣ Injeção de headers com caminho e URL completos
function injectCurrentUrlHeaders(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers)
  headers.set('x-current-path', request.nextUrl.pathname)
  headers.set('x-current-url', request.url)
  return NextResponse.next({ headers })
}

export function proxy(request: NextRequest) {
  // 1. Tenta aplicar redirecionamento
  const redirectResponse = redirectToEng(request)
  if (redirectResponse) return redirectResponse

  // 2. Se não houve redirecionamento, aplica headers
  return injectCurrentUrlHeaders(request)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|banner.jpg).*)',
  ],
}
