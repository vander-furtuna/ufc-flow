'use client'

import { ExternalLink } from 'lucide-react'
import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type NewUrlLinkProps = ComponentProps<'a'>

export function NewUrlLink({ className, ...rest }: NewUrlLinkProps) {
  return (
    <a
      className={cn(
        'animate-border [background:linear-gradient(45deg,theme(colors.slate.100),theme(colors.slate.100)_50%,theme(colors.slate.100))_padding-box,conic-gradient(from_var(--border-angle),theme(colors.border)_80%,_theme(colors.amber.500)_86%,_theme(colors.emerald.300)_90%,_theme(colors.sky.500)_94%,_theme(colors.slate.600/.48))_border-box] dark:[background:linear-gradient(45deg,theme(colors.slate.900),theme(colors.slate.900)_50%,theme(colors.slate.900))_padding-box,conic-gradient(from_var(--border-angle),theme(colors.border)_80%,_theme(colors.amber.500)_86%,_theme(colors.emerald.300)_90%,_theme(colors.sky.500)_94%,_theme(colors.slate.200/.48))_border-box] flex h-12 w-full items-center justify-center gap-2 rounded-sm border-1 border-transparent px-3',
        className,
      )}
      rel="noreferrer"
      target="_self"
      href="https://flow.ufc.br"
      {...rest}
    >
      <div className="flex w-full flex-col items-start overflow-hidden">
        <strong className="text-foreground w-full truncate text-left text-sm font-medium text-ellipsis">
          UFC Flow tem um NOVO ENDEREÇO!
        </strong>
        <span className="text-xs">flow.ufc.br | Acesse aqui!</span>
      </div>
      <ExternalLink className="text-muted-foreground size-4 shrink-0" />
    </a>
  )
}
