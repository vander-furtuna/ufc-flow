'use client'

import { CONSENT_VERSIONS, type ConsentDocument } from '@ufc-flow/contracts'
import {
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
  SignOutIcon,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { FormAlert, InfoNote } from '@/components/auth/form-parts'
import { Button } from '@/components/ui/button'
import { acceptConsentsAction } from '@/lib/account/account-actions'
import { signOutAction } from '@/lib/auth/actions'
import { SESSION_QUERY_KEY } from '@/lib/auth/use-session'

const DOCUMENTS: Record<
  ConsentDocument,
  { label: string; href: string; version: string }
> = {
  TERMS: {
    label: 'Termos de uso',
    href: '/termos',
    version: CONSENT_VERSIONS.terms,
  },
  PRIVACY: {
    label: 'Política de privacidade',
    href: '/privacidade',
    version: CONSENT_VERSIONS.privacy,
  },
}

export function ConsentAcceptance({
  pending,
  next,
}: {
  pending: ConsentDocument[]
  next: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, startAccepting] = useTransition()
  const [isLeaving, startLeaving] = useTransition()

  const accept = () =>
    startAccepting(async () => {
      setError(null)
      const result = await acceptConsentsAction()
      if (!result.ok) {
        setError(
          result.problem.detail ?? 'Não foi possível registrar o aceite.',
        )
        return
      }
      queryClient.setQueryData(SESSION_QUERY_KEY, result.data)
      router.replace(next)
    })

  const signOut = () =>
    startLeaving(async () => {
      await signOutAction()
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      router.replace('/cursos')
    })

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {pending.map((document) => {
          const { label, href, version } = DOCUMENTS[document]
          return (
            <li key={document}>
              <Link
                href={href}
                target="_blank"
                className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground">
                    Versão {version}
                  </span>
                </span>
                <ArrowSquareOutIcon
                  aria-hidden
                  className="size-5 text-muted-foreground"
                />
                <span className="sr-only">(abre em nova aba)</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <InfoNote>
        A nova versão descreve o que a conta guarda hoje (histórico, agendas,
        hub, fórum, avaliações e arquivos), como baixar os seus dados e como
        excluir a conta. Se não quiser aceitar, você pode baixar seus dados,
        excluir a conta ou sair e continuar usando o UFC Flow sem conta.
      </InfoNote>
      <FormAlert message={error} />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          size="lg"
          onClick={accept}
          disabled={isAccepting || isLeaving}
          aria-busy={isAccepting}
        >
          {isAccepting ? 'Registrando…' : 'Li e aceito'}
        </Button>
        <Button size="lg" variant="outline" className="gap-2" asChild>
          <a href="/api/me/export" download>
            <DownloadSimpleIcon aria-hidden />
            Baixar meus dados
          </a>
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="gap-2"
          onClick={signOut}
          disabled={isAccepting || isLeaving}
        >
          <SignOutIcon aria-hidden />
          Sair
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Prefere excluir a conta?{' '}
        <Link href="/minha-area/conta" className="underline">
          Vá para Minha conta
        </Link>
        .
      </p>
    </div>
  )
}
