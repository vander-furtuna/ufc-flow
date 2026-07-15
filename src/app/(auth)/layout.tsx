import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full">
      <aside className="bg-muted flex flex-1"></aside>
      <section className="flex w-lg shrink-0 flex-col justify-center gap-8 px-16">
        {children}
      </section>
    </div>
  )
}
