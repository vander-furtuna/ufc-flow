'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from './user-avatar'
import { AccountMenuThemeToggle } from '@/features/auth/components/account-menu-theme-toggle'
import { LogOut, User } from 'lucide-react'
import { useAuthContext } from '@/contexts/auth'
import Link from 'next/link'

export function UserAccountMenu() {
  const { user, signOut } = useAuthContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <button type="button" {...props}>
            <UserAvatar />
          </button>
        )}
      />
      <DropdownMenuContent className="w-40 shadow-none" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
          {!user?.courseRoles || user.courseRoles.length === 0 ? (
            <Link href="/perfil" className="w-full cursor-pointer">
              <DropdownMenuItem className="cursor-pointer">
                <User className="size-5" />
                Completar perfil
              </DropdownMenuItem>
            </Link>
          ) : (
            <Link href="/perfil" className="w-full cursor-pointer">
              <DropdownMenuItem className="cursor-pointer">
                <User className="size-5" />
                Meu Perfil
              </DropdownMenuItem>
            </Link>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <AccountMenuThemeToggle />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="text-destructive cursor-pointer"
            onClick={() => signOut()}
          >
            <LogOut className="size-5" /> Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
