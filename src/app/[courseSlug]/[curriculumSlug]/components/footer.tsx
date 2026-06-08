import { FaGithub, FaInstagram } from 'react-icons/fa'

import { Button } from '@/components/ui/button'
import { VanderLogo } from '@/components/vander-logo'
import { Logo } from '@/components/logo'
import ufcLogo from '@/assets/ufc-logo.svg'
import ecLogo from '@/assets/ec-logo.svg'
import { ChevronUp } from 'lucide-react'
import { VanderIcon } from '@/components/vander-icon'

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="relative mt-auto flex w-full flex-col pb-0">
      <div className="flex w-full items-center justify-between pb-6">
        <div className="flex flex-col gap-4">
          <Logo className="text-muted-foreground h-12 w-fit" />
        </div>

        <Button size="icon" variant="outline" onClick={scrollToTop}>
          <ChevronUp className="text-foreground/80 size-5" />
        </Button>
      </div>
      <div className="flex w-full items-center justify-between border-t pt-4">
        <div className="flex items-center gap-3">
          <VanderLogo className="h-12 w-fit" />
          <div className="bg-muted h-6 w-0.5" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ufcLogo.src} alt="UFC Logo" className="h-10 w-fit" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ecLogo.src} alt="EC Logo" className="h-8 w-fit" />
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
      </div>
      <VanderIcon className="absolute top-0 left-1/2 -z-1 w-[calc(100%+2rem)] -translate-x-1/2 md:w-full" />
    </footer>
  )
}
