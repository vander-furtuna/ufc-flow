import { type NextRequest, NextResponse } from 'next/server'

import { getUrl } from './lib/get-url'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.includes('/banner.png')) {
    return
  }

  if (!pathname.includes('/engenharia-de-computacao-ufc-sobral/2006-2')) {
    return NextResponse.redirect(
      new URL(getUrl('/engenharia-de-computacao-ufc-sobral/2006-2')),
    )
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|banner.png).*)',
  ],
}
