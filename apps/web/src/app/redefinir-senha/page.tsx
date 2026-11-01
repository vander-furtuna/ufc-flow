import type { Metadata } from 'next'
import Link from 'next/link'

import { InfoNote } from '@/components/auth/form-parts'
import { SimplePage } from '@/components/simple-page'

import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Redefinir senha',
  robots: { index: false },
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <SimplePage
      title="Redefinir senha"
      subtitle="Escolha uma senha nova. O link vale uma vez e por 24 horas."
    >
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <InfoNote>
            Este endereço não tem um link de redefinição. Peça a um
            administrador um link novo de uso único.
          </InfoNote>
        )}
        <Link
          href="/entrar"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Voltar para Entrar
        </Link>
      </div>
    </SimplePage>
  )
}
