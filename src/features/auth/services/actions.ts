'use server'

import { cookies } from 'next/headers'
import { signInRequest, signUpRequest, signOutRequest } from './index'
import { SignInSchema, SignUpSchema } from '../schemas/auth.schema'
import { User } from '../types'

const isProd = process.env.NODE_ENV === 'production'

export async function signInAction(dto: SignInSchema) {
  try {
    const response = await signInRequest(dto)
    const cookieStore = await cookies()

    // Grava cookies HttpOnly seguros para os Tokens
    cookieStore.set('accessToken', response.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutos
    })

    cookieStore.set('refreshToken', response.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    })

    // Grava cookie público não-HttpOnly com dados básicos do usuário
    // para inicialização rápida no client-side
    cookieStore.set('userSession', JSON.stringify(response.user), {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return { data: response.user, error: null }
  } catch (error) {
    const err = error as {
      json?: () => Promise<{ message?: string }>
      message?: string
    }
    let errorMessage = 'Erro ao realizar login. Verifique suas credenciais.'
    if (err && typeof err.json === 'function') {
      try {
        const errBody = await err.json()
        errorMessage = errBody.message || errorMessage
      } catch {}
    } else if (err && err.message) {
      errorMessage = err.message
    }
    return { data: null, error: errorMessage }
  }
}

export async function signUpAction(dto: SignUpSchema) {
  try {
    const user = await signUpRequest(dto)
    return { data: user, error: null }
  } catch (error) {
    const err = error as {
      json?: () => Promise<{ message?: string }>
      message?: string
    }
    let errorMessage = 'Erro ao realizar cadastro.'
    if (err && typeof err.json === 'function') {
      try {
        const errBody = await err.json()
        errorMessage = errBody.message || errorMessage
      } catch {}
    } else if (err && err.message) {
      errorMessage = err.message
    }
    return { data: null, error: errorMessage }
  }
}

export async function signOutAction() {
  const cookieStore = await cookies()

  try {
    // Tenta invalidar no backend NestJS (pode falhar se o token já expirou)
    await signOutRequest()
  } catch {}

  // Deleta cookies em todos os casos
  cookieStore.delete('accessToken')
  cookieStore.delete('refreshToken')
  cookieStore.delete('userSession')

  return { success: true }
}

export async function getCurrentUserAction(): Promise<User | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('userSession')?.value

  if (!session) return null

  try {
    return JSON.parse(session) as User
  } catch {
    return null
  }
}
