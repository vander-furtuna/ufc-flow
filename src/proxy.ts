// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

// 1️⃣ Redirecionamento para um caminho específico
function redirectToEng(request: NextRequest): NextResponse | undefined {
  const pathname = request.nextUrl.pathname
  if (pathname.includes('/banner.png')) return undefined

  if (!pathname.includes('/engenharia-de-computacao-ufc-sobral/2006-2')) {
    const host = request.headers.get('host') ?? 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const redirectUrl = `${protocol}://${host}/engenharia-de-computacao-ufc-sobral/2006-2`
    return NextResponse.redirect(new URL(redirectUrl))
  }

  return undefined
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
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|banner.png).*)',
  ],
}
