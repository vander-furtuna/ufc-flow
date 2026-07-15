import ky from 'ky'
import { cookies } from 'next/headers'

// URL padrão da API NestJS
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const api = ky.create({
  prefix: API_URL,
  timeout: 15000,
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('accessToken')?.value

        if (accessToken) {
          request.headers.set('Authorization', `Bearer ${accessToken}`)
        }
      },
    ],
    afterResponse: [
      async ({ request, response }) => {
        // Se receber 401 Unauthorized e NÃO for a própria chamada de login/refresh
        const isAuthRoute =
          request.url.includes('/auth/sign-in') ||
          request.url.includes('/auth/refresh')

        if (response.status === 401 && !isAuthRoute) {
          try {
            const cookieStore = await cookies()
            const refreshToken = cookieStore.get('refreshToken')?.value

            if (!refreshToken) {
              throw new Error('Refresh token não encontrado nos cookies.')
            }

            // Realiza a chamada de refresh do token diretamente via ky (para evitar loop)
            const refreshResponse = await ky
              .post(`${API_URL}/auth/refresh`, {
                json: { refreshToken },
              })
              .json<{ accessToken: string; refreshToken: string }>()

            // Atualiza os cookies seguros no Next.js (Server-side)
            const isProd = process.env.NODE_ENV === 'production'

            cookieStore.set('accessToken', refreshResponse.accessToken, {
              httpOnly: true,
              secure: isProd,
              sameSite: 'lax',
              path: '/',
              maxAge: 15 * 60, // 15 minutos
            })

            cookieStore.set('refreshToken', refreshResponse.refreshToken, {
              httpOnly: true,
              secure: isProd,
              sameSite: 'lax',
              path: '/',
              maxAge: 7 * 24 * 60 * 60, // 7 dias
            })

            // Atualiza o header de autorização da requisição original e refaz
            request.headers.set(
              'Authorization',
              `Bearer ${refreshResponse.accessToken}`,
            )
            return ky(request)
          } catch {
            // Se falhar o refresh (ex: refresh token expirado), invalida a sessão
            const cookieStore = await cookies()
            cookieStore.delete('accessToken')
            cookieStore.delete('refreshToken')
            cookieStore.delete('userSession')

            throw new Error('Sessão expirada. Faça login novamente.')
          }
        }

        return response
      },
    ],
  },
})
