'use client'

import Link from 'next/link'
import { Logo } from './logo'
import { ModeToggle } from './theme-toggle'
import { LogInIcon } from 'lucide-react'
import { UserAccountMenu } from '@/features/user/components/user-account-menu'
import { useAuthContext } from '@/contexts/auth'

export function Header() {
  const { isAuthenticated } = useAuthContext()

  return (
    <header className="flex w-full items-start justify-between">
      <div>
        <Logo className="h-12 w-auto sm:h-14" />
      </div>
      {isAuthenticated ? (
        <UserAccountMenu />
      ) : (
        <div className="flex items-center gap-0.5">
          <Link href="/entrar">
            <button className="group/filter bg-accent border-border relative flex shrink-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-md border px-3 py-1.5">
              <span className="z-10 text-sm text-nowrap">Entrar</span>
              <LogInIcon className="text-muted-foreground group-data-[active=active]/filter:text-foreground z-10 size-4" />
            </button>
          </Link>

          <ModeToggle />
        </div>
      )}
    </header>
  )
}
