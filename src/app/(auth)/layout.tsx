import type { ReactNode } from 'react'

import { ThreeDMarquee } from '@/components/ui/3d-marquee'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full">
      <aside className="bg-muted relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
        <ThreeDMarquee />
      </aside>
      <section className="flex w-lg shrink-0 flex-col items-center justify-center gap-8">
        <div className="flex w-full max-w-80 flex-col justify-center gap-8">
          {children}
        </div>
      </section>
    </div>
  )
}
