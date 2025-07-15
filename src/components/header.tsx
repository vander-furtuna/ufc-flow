import { Logo } from './logo'
import { ModeToggle } from './theme-toggle'
import { SubtitlePopup } from './ui/subtitle-popup'

export function Header() {
  return (
    <header className="flex w-full items-start justify-between">
      <div>
        <Logo className="h-14 w-auto" />
      </div>
      <div className="flex items-center gap-1">
        <SubtitlePopup />
        <ModeToggle />
      </div>
    </header>
  )
}
