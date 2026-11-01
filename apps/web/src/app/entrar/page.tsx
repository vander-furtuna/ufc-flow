import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { safeNext } from '@/components/auth/form-parts'
import { getCurrentUser } from '@/lib/auth/session'

import { AuthScreen } from './auth-screen'

export const metadata: Metadata = {
  title: 'Entrar',
  description:
    'Entre ou crie sua conta para guardar histórico, agendas e participar do hub do seu curso.',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; next?: string }>
}) {
  const { aba, next } = await searchParams
  const destination = safeNext(next)
  if (await getCurrentUser()) redirect(destination)
  return (
    <AuthScreen
      initialTab={aba === 'criar' ? 'criar' : 'entrar'}
      next={destination}
    />
  )
}
