import type { AuthTokens } from '@ufc-flow/contracts'

// Nomes e opções dos cookies da sessão. O access token vive até expirar
// (15 min); o refresh token, 30 dias. Ambos httpOnly: o JavaScript do
// navegador nunca vê os tokens.
export const ACCESS_COOKIE = 'ufcflow_access'
export const REFRESH_COOKIE = 'ufcflow_refresh'

type CookieOptions = {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  expires: Date
}

const options = (expires: Date): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  expires,
})

export function sessionCookies(tokens: AuthTokens) {
  return [
    {
      name: ACCESS_COOKIE,
      value: tokens.accessToken,
      ...options(new Date(tokens.accessTokenExpiresAt)),
    },
    {
      name: REFRESH_COOKIE,
      value: tokens.refreshToken,
      ...options(new Date(tokens.refreshTokenExpiresAt)),
    },
  ]
}
