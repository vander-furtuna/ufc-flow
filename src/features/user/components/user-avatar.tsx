import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { ComponentProps } from 'react'

type UserAvatarProps = ComponentProps<typeof Avatar>

export function UserAvatar({ ...props }: UserAvatarProps) {
  return (
    <Avatar className="size-12" {...props}>
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}
