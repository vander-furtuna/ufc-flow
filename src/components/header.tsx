import { Logo } from './logo'
import { ModeToggle } from './theme-toggle'
import { UserPopup } from './user-popup'

export function Header() {
  return (
    <header className="w-full justify-between items-start flex">
      <div>
        <Logo className="h-12 w-auto" />
      </div>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <UserPopup />
      </div>
    </header>
  )
}
