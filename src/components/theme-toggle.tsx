'use client'

import { Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button variant="ghost" size="icon" {...props}>
            <Sun className="text-muted-foreground h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="text-muted-foreground absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}
      />
      <DropdownMenuContent
        align="end"
        className="border-border bg-accent/50 p-0 backdrop-blur-md"
      >
        <DropdownMenuLabel className="bg-accent font-heading flex h-10 items-center px-3 text-base">
          Tema
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0 p-0" />
        <div className="flex flex-col gap-1 px-1 py-2">
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
