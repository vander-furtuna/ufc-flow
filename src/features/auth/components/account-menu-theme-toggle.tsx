import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'

export function AccountMenuThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {theme === 'light' ? (
          <Sun className="size-5" />
        ) : theme === 'dark' ? (
          <Moon className="size-5" />
        ) : (
          <SunMoon className="size-5" />
        )}
        Tema
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => setTheme('light')} className="h-9">
            <Sun className="mr-2 size-5" />
            <span>Claro</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')} className="h-9">
            <Moon className="mr-2 size-5" />
            <span>Escuro</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')} className="h-9">
            <SunMoon className="mr-2 size-5" />
            Auto
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
