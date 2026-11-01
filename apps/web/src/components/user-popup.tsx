'use client'

import { UserIcon } from '@phosphor-icons/react'
import { useCallback } from 'react'
import { toast } from 'sonner'

export function UserPopup() {
  const handleOpenUserPopup = useCallback(() => {
    toast.info('Essa funcionalidade ainda não está disponível.')
  }, [])

  return (
    <button
      className="center flex size-12 rounded-full bg-foreground opacity-30 ring-1 ring-muted-foreground/25"
      onClick={handleOpenUserPopup}
    >
      <UserIcon weight="bold" className="size-6 text-muted" />
    </button>
  )
}
