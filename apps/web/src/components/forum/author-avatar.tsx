import { fileUrl } from '@/lib/files/upload'
import { initials } from '@/lib/forum/mention-editor'
import { cn } from '@/lib/utils'

// Cores das iniciais (mockup Forum), escolhidas pelo nome
const COLORS = [
  'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
]

function colorOf(name: string) {
  let sum = 0
  for (let index = 0; index < name.length; index++)
    sum += name.charCodeAt(index)
  return COLORS[sum % COLORS.length]
}

export function AuthorAvatar({
  name,
  avatarFileId,
  size = 'md',
}: {
  name: string | null
  avatarFileId?: string | null
  size?: 'sm' | 'md'
}) {
  const box = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm'
  if (avatarFileId) {
    return (
      <img
        src={fileUrl(avatarFileId)}
        alt=""
        width={40}
        height={40}
        className={cn('shrink-0 rounded-full object-cover', box)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        box,
        name ? colorOf(name) : 'bg-muted text-muted-foreground',
      )}
    >
      {name ? initials(name) : '?'}
    </span>
  )
}
