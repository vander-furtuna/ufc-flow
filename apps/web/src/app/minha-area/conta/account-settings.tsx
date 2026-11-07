'use client'

import { CONSENT_VERSIONS, type Me } from '@ufc-flow/contracts'
import { DownloadSimpleIcon, WarningIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { DeleteAccountDialog } from './delete-account-dialog'

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeZone: 'America/Fortaleza',
})

function Section({
  title,
  children,
  tone = 'default',
}: {
  title: string
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <section
      aria-label={title}
      className={
        tone === 'danger'
          ? 'flex flex-col gap-3 rounded-2xl border border-destructive/40 p-5'
          : 'flex flex-col gap-3 rounded-2xl border bg-background p-5'
      }
    >
      <h2 className="font-clash text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function AccountSettings({ user }: { user: Me }) {
  return (
    <div className="flex flex-col gap-6">
      <Section title="Seus dados">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Nome</dt>
          <dd className="font-medium">{user.name}</dd>
          <dt className="text-muted-foreground">E-mail</dt>
          <dd className="font-medium break-all">{user.email}</dd>
          <dt className="text-muted-foreground">Conta criada em</dt>
          <dd className="font-medium">
            {dateFormat.format(new Date(user.createdAt))}
          </dd>
        </dl>
        <p className="text-sm text-muted-foreground">
          Documentos aceitos:{' '}
          <Link href="/termos" className="underline">
            Termos de uso
          </Link>{' '}
          (versão {CONSENT_VERSIONS.terms}) e{' '}
          <Link href="/privacidade" className="underline">
            Política de privacidade
          </Link>{' '}
          (versão {CONSENT_VERSIONS.privacy}).
        </p>
      </Section>

      <Section title="Baixar meus dados">
        <p className="text-sm text-muted-foreground">
          Um arquivo JSON com tudo o que a sua conta guarda: matrículas,
          histórico, horas, agendas, mensagens do fórum, avaliações,
          notificações e a lista dos seus arquivos. Fotos e certificados não vão
          dentro do arquivo; eles continuam disponíveis nas páginas onde foram
          enviados.
        </p>
        <a
          href="/api/me/export"
          download
          className="inline-flex h-11 w-fit items-center gap-2 rounded-full border px-5 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <DownloadSimpleIcon aria-hidden className="size-4" />
          Baixar meus dados
        </a>
      </Section>

      <Section title="Excluir conta" tone="danger">
        <p className="flex items-start gap-2 text-sm">
          <WarningIcon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-destructive"
          />
          A exclusão é definitiva. Se quiser guardar seus dados, baixe o arquivo
          antes.
        </p>
        <DeleteAccountDialog isAdmin={user.roles.includes('ADMIN')} />
      </Section>
    </div>
  )
}
