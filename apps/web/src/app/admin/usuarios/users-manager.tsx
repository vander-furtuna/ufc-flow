'use client'

import type {
  AdminUser,
  PasswordResetLink,
  UserStatus,
} from '@ufc-flow/contracts'
import {
  CopyIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
  ArrowCounterClockwiseIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  discardEvaluationsAction,
  listUsersAction,
  passwordResetLinkAction,
  reactivateUserAction,
  suspendUserAction,
  type AccountResult,
} from '@/lib/account/account-actions'
import { cn } from '@/lib/utils'

import { Chip, PageHeader } from '../_components/page-header'

export const ADMIN_USERS_KEY = ['admin', 'users'] as const

const FILTERS: { value: UserStatus | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'SUSPENDED', label: 'Suspensas' },
]

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeZone: 'America/Fortaleza',
})
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Fortaleza',
})

type Pending = {
  kind: 'suspend' | 'reactivate' | 'discard'
  user: AdminUser
} | null

const CONFIRM = {
  suspend: {
    title: 'Suspender a conta?',
    description:
      'As sessões abertas são encerradas e a pessoa não consegue entrar até a conta ser reativada. Os dados continuam guardados.',
    action: 'Suspender',
  },
  reactivate: {
    title: 'Reativar a conta?',
    description: 'A pessoa volta a entrar normalmente.',
    action: 'Reativar',
  },
  discard: {
    title: 'Descartar as avaliações?',
    description:
      'As avaliações de disciplina desta conta são apagadas e saem das médias. Use em contas suspeitas; não dá para desfazer.',
    action: 'Descartar',
  },
} as const

function unwrap<T>(result: AccountResult<T>): T {
  if (!result.ok) throw new Error(result.problem.detail ?? 'Indisponível')
  return result.data
}

function ResetLinkDialog({
  link,
  name,
  onClose,
}: {
  link: PasswordResetLink
  name: string
  onClose: () => void
}) {
  const fieldId = useId()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url)
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar; selecione o link e copie')
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link de redefinição de senha</DialogTitle>
          <DialogDescription>
            Entregue a {name} por fora (não enviamos e-mails). Vale uma vez, até{' '}
            {dateTimeFormat.format(new Date(link.expiresAt))}, e invalida os
            links anteriores.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>Link</Label>
          <div className="flex gap-2">
            <Input
              id={fieldId}
              readOnly
              value={link.url}
              className="font-mono text-xs"
              onFocus={(event) => event.target.select()}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={copy}
            >
              <CopyIcon aria-hidden className="size-4" />
              Copiar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UserCard({
  user,
  isSelf,
  busy,
  onAction,
  onResetLink,
}: {
  user: AdminUser
  isSelf: boolean
  busy: boolean
  onAction: (kind: 'suspend' | 'reactivate' | 'discard') => void
  onResetLink: () => void
}) {
  const isAdmin = user.roles.includes('ADMIN')
  const suspended = user.status === 'SUSPENDED'
  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:flex-row sm:items-center',
        suspended && 'border-dashed',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{user.name}</span>
          {isSelf && (
            <Chip className="bg-muted text-muted-foreground">Você</Chip>
          )}
          {isAdmin && (
            <Chip className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
              Admin
            </Chip>
          )}
          {suspended && (
            <Chip className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">
              Suspensa
            </Chip>
          )}
        </span>
        <span className="text-sm break-all text-muted-foreground">
          {user.email}
        </span>
        <span className="text-xs text-muted-foreground">
          Conta criada em {dateFormat.format(new Date(user.createdAt))} ·{' '}
          {user.evaluationCount === 1
            ? '1 avaliação'
            : `${user.evaluationCount} avaliações`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={onResetLink}
        >
          <KeyIcon aria-hidden className="size-4" />
          Link de senha
        </Button>
        {suspended ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onAction('reactivate')}
          >
            <ArrowCounterClockwiseIcon aria-hidden className="size-4" />
            Reativar
          </Button>
        ) : (
          !isSelf &&
          !isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={busy}
              onClick={() => onAction('suspend')}
            >
              <ProhibitIcon aria-hidden className="size-4" />
              Suspender
            </Button>
          )
        )}
        {user.evaluationCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => onAction('discard')}
          >
            <TrashIcon aria-hidden className="size-4" />
            Descartar avaliações
          </Button>
        )}
      </div>
    </li>
  )
}

// Admin › Usuários: busca, suspensão, link de senha e descarte de avaliações
// (mitigações da identidade não verificada, D98)
export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const searchId = useId()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<UserStatus | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [resetLink, setResetLink] = useState<{
    link: PasswordResetLink
    name: string
  } | null>(null)
  const [isWorking, startWorking] = useTransition()

  const users = useInfiniteQuery({
    queryKey: [...ADMIN_USERS_KEY, q, status],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await listUsersAction({
          q: q || undefined,
          status: status ?? undefined,
          cursor: pageParam,
          limit: 20,
        }),
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
  const list = users.data?.pages.flatMap((page) => page.items) ?? []

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQ(text.trim())
  }

  const generateLink = (user: AdminUser) =>
    startWorking(async () => {
      const result = await passwordResetLinkAction(user.id)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível gerar o link')
        return
      }
      setResetLink({ link: result.data, name: user.name })
    })

  const confirm = () => {
    if (!pending) return
    const { kind, user } = pending
    startWorking(async () => {
      const result =
        kind === 'suspend'
          ? await suspendUserAction(user.id)
          : kind === 'reactivate'
            ? await reactivateUserAction(user.id)
            : await discardEvaluationsAction(user.id)
      if (!result.ok) {
        toast.error(result.problem.detail ?? 'Não foi possível concluir')
        return
      }
      setPending(null)
      toast.success(
        kind === 'suspend'
          ? 'Conta suspensa'
          : kind === 'reactivate'
            ? 'Conta reativada'
            : 'Avaliações descartadas',
      )
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY })
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Usuários"
        description="Busque por nome ou e-mail. Suspender encerra as sessões; a conta não entra até ser reativada."
      />
      <div className="flex flex-col gap-3">
        <search>
          <form onSubmit={search} className="flex gap-2">
            <Label htmlFor={searchId} className="sr-only">
              Buscar por nome ou e-mail
            </Label>
            <Input
              id={searchId}
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Nome ou e-mail"
              maxLength={120}
              className="h-11"
            />
            <Button type="submit" className="h-11 gap-2">
              <MagnifyingGlassIcon aria-hidden className="size-4" />
              Buscar
            </Button>
          </form>
        </search>
        <fieldset className="flex gap-2 overflow-x-auto">
          <legend className="sr-only">Situação da conta</legend>
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => setStatus(filter.value)}
              className="h-9 shrink-0 rounded-full border px-4 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {filter.label}
            </button>
          ))}
        </fieldset>
      </div>

      {users.isPending ? (
        <div
          aria-hidden
          className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
        />
      ) : users.isError ? (
        <p role="alert" className="rounded-2xl border p-6 text-sm">
          {users.error.message}
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma conta encontrada.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Contas">
          {list.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isSelf={user.id === currentUserId}
              busy={isWorking}
              onAction={(kind) => setPending({ kind, user })}
              onResetLink={() => generateLink(user)}
            />
          ))}
        </ul>
      )}
      {users.hasNextPage && (
        <Button
          variant="outline"
          className="self-center"
          disabled={users.isFetchingNextPage}
          onClick={() => users.fetchNextPage()}
        >
          {users.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </Button>
      )}

      {pending && (
        <Dialog open onOpenChange={(open) => !open && setPending(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{CONFIRM[pending.kind].title}</DialogTitle>
              <DialogDescription>
                {pending.user.name} ({pending.user.email}).{' '}
                {CONFIRM[pending.kind].description}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setPending(null)}>
                Cancelar
              </Button>
              <Button
                variant={
                  pending.kind === 'reactivate' ? 'default' : 'destructive'
                }
                disabled={isWorking}
                aria-busy={isWorking}
                onClick={confirm}
              >
                {CONFIRM[pending.kind].action}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {resetLink && (
        <ResetLinkDialog
          link={resetLink.link}
          name={resetLink.name}
          onClose={() => setResetLink(null)}
        />
      )}
    </div>
  )
}
