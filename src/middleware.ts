import { type NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.includes('/banner.png')) {
    return
  }

  if (!pathname.includes('/engenharia-de-computacao-ufc-sobral/2006-2')) {
    // Get host from the request
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const redirectUrl = `${protocol}://${host}/engenharia-de-computacao-ufc-sobral/2006-2`

    return NextResponse.redirect(new URL(redirectUrl))
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|banner.png).*)',
  ],
}
