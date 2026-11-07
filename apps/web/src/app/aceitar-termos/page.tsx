import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { safeNext } from '@/components/auth/form-parts'
import { SimplePage } from '@/components/simple-page'
import { getCurrentUser } from '@/lib/auth/session'

import { ConsentAcceptance } from './consent-acceptance'

export const metadata: Metadata = {
  title: 'Termos atualizados',
  robots: { index: false },
}

// Novo aceite (D46): quem aceitou uma versão anterior dos Termos ou da
// Política chega aqui pelo ConsentGate e volta para onde estava
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const next = safeNext((await searchParams).next)
  const user = await getCurrentUser()
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`)
  if (user.pendingConsents.length === 0) redirect(next)

  return (
    <SimplePage
      title="Atualizamos nossos documentos"
      subtitle="Para continuar usando a sua conta, leia e aceite a versão atual."
    >
      <ConsentAcceptance pending={user.pendingConsents} next={next} />
    </SimplePage>
  )
}
