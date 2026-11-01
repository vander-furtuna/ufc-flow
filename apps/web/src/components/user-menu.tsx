'use client'

import { SignOutIcon, UserIcon } from '@phosphor-icons/react'
import type { Me } from '@ufc-flow/contracts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAction } from '@/lib/auth/actions'

export const SESSION_QUERY_KEY = ['auth', 'session'] as const

async function fetchSession(): Promise<Me | null> {
  const response = await fetch('/api/auth/session', { cache: 'no-store' })
  if (!response.ok) return null
  return ((await response.json()) as { user: Me | null }).user
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

// Entrar (anônimo) ou o menu da conta (logado). O uso anônimo continua
// igual: nada da grade, turmas ou agenda depende daqui.
export function UserMenu() {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLeaving, startLeaving] = useTransition()
  const { data: user, isPending } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 60_000,
  })

  if (isPending) return <span className="size-9" aria-hidden />

  if (!user) {
    return (
      <Link
        href={`/entrar?next=${encodeURIComponent(pathname)}`}
        className="flex h-9 items-center gap-1.5 rounded-full border bg-accent px-3 text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <UserIcon className="size-4" />
        Entrar
      </Link>
    )
  }

  const signOut = () =>
    startLeaving(async () => {
      await signOutAction()
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      router.refresh()
    })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta de ${user.name}`}
        className="flex size-9 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {initials(user.name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isLeaving} onSelect={signOut}>
          <SignOutIcon className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
