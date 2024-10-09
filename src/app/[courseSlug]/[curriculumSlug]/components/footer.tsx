import { FaGithub, FaInstagram } from 'react-icons/fa'

import { Button } from '@/components/ui/button'
import { VanderLogo } from '@/components/vander-logo'

export function Footer() {
  return (
    <footer className="mt-auto flex h-24 w-full items-center justify-between pb-4">
      <div className="flex items-center gap-4">
        <span className="font-space text-sm font-semibold">Powered By</span>
        <VanderLogo className="h-12 w-fit" />
      </div>
      <div>
        <Button size="icon" variant="ghost" asChild>
          <a
            href="https://www.instagram.com/vander.furtuna/"
            target="_blank"
            rel="noreferrer"
          >
            <FaInstagram size={24} className="text-muted-foreground" />
          </a>
        </Button>
        <Button size="icon" variant="ghost" asChild>
          <a
            href="https://github.com/vander-furtuna"
            target="_blank"
            rel="noreferrer"
          >
            <FaGithub size={24} className="text-muted-foreground" />
          </a>
        </Button>
      </div>
    </footer>
  )
}
