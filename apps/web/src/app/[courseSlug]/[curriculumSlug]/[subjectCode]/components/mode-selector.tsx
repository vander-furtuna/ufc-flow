import { GitCommitIcon, GitPullRequestIcon } from '@phosphor-icons/react'
import type { ComponentProps } from 'react'

type ModeSelectorProps = {
  mode: 'direct' | 'full'
  setMode: (mode: 'direct' | 'full') => void
}

type ChangeModeButtonProps = ComponentProps<'button'> & {
  isActive: boolean
}

function ChangeModeButton({ isActive, ...props }: ChangeModeButtonProps) {
  return (
    <button
      className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-sm text-nowrap text-foreground transition-all duration-200 data-[state=active]:bg-foreground data-[state=active]:text-accent"
      data-state={isActive ? 'active' : 'inactive'}
      {...props}
    />
  )
}

export function ModeSelector({ mode, setMode }: ModeSelectorProps) {
  return (
    <div className="absolute bottom-18 left-1/2 z-20 flex w-fit -translate-x-1/2 gap-1 rounded-full border border-border bg-accent/50 px-2 py-1.5 shadow-lg backdrop-blur-md transition-colors duration-300">
      <ChangeModeButton
        onClick={() => setMode('direct')}
        isActive={mode === 'direct'}
      >
        <GitCommitIcon weight="bold" className="size-4 shrink-0" />
        Direto
      </ChangeModeButton>
      <ChangeModeButton
        onClick={() => setMode('full')}
        isActive={mode === 'full'}
      >
        <GitPullRequestIcon weight="bold" className="size-4 shrink-0" />
        Cadeia Completa
      </ChangeModeButton>
    </div>
  )
}
