'use client'

import {
  CameraIcon,
  GraduationCapIcon,
  SignOutIcon,
  TrashIcon,
  UserIcon,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useTransition, type ChangeEvent } from 'react'
import { toast } from 'sonner'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAction } from '@/lib/auth/actions'
import { SESSION_QUERY_KEY, useSession } from '@/lib/auth/use-session'
import { removeAvatarAction, setAvatarAction } from '@/lib/files/avatar-actions'
import { fileUrl, uploadFile } from '@/lib/files/upload'

// Conferido também na API; aqui só evita enviar o que vai ser recusado
const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

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
  const [isSavingPhoto, startSavingPhoto] = useTransition()
  const photoInput = useRef<HTMLInputElement>(null)
  const { data: user, isPending } = useSession()

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

  const changePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('Foto grande demais', { description: 'Envie até 5 MB.' })
      return
    }
    startSavingPhoto(async () => {
      const uploaded = await uploadFile(file, 'AVATAR')
      const saved = uploaded.ok
        ? await setAvatarAction(uploaded.data.id)
        : uploaded
      if (!saved.ok) {
        toast.error('Não foi possível trocar a foto', {
          description: saved.problem.detail,
        })
        return
      }
      queryClient.setQueryData(SESSION_QUERY_KEY, saved.data)
      toast.success('Foto atualizada')
    })
  }

  const removePhoto = () =>
    startSavingPhoto(async () => {
      const result = await removeAvatarAction()
      if (!result.ok) {
        toast.error('Não foi possível remover a foto', {
          description: result.problem.detail,
        })
        return
      }
      queryClient.setQueryData(SESSION_QUERY_KEY, result.data)
    })

  const signOut = () =>
    startLeaving(async () => {
      await signOutAction()
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      router.refresh()
    })

  return (
    <DropdownMenu>
      <input
        ref={photoInput}
        type="file"
        accept={AVATAR_TYPES}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={changePhoto}
      />
      <DropdownMenuTrigger
        aria-label={`Conta de ${user.name}`}
        aria-busy={isSavingPhoto}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-orange-500 text-xs font-semibold text-white hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none aria-busy:animate-pulse"
      >
        {user.avatarFileId ? (
          <img
            src={fileUrl(user.avatarFileId)}
            alt=""
            width={36}
            height={36}
            className="size-full object-cover"
          />
        ) : (
          initials(user.name)
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2">
          <Link href="/minha-area">
            <GraduationCapIcon className="size-4" />
            Minha área
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          disabled={isSavingPhoto}
          onSelect={() => photoInput.current?.click()}
        >
          <CameraIcon className="size-4" />
          {user.avatarFileId ? 'Alterar foto' : 'Adicionar foto'}
        </DropdownMenuItem>
        {user.avatarFileId && (
          <DropdownMenuItem
            className="gap-2"
            disabled={isSavingPhoto}
            onSelect={removePhoto}
          >
            <TrashIcon className="size-4" />
            Remover foto
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          disabled={isLeaving}
          onSelect={signOut}
        >
          <SignOutIcon className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
