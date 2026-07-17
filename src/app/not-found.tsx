import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-6 pt-12 pb-24">
      <section className="flex w-full max-w-4xl flex-col gap-12">
        <Header />

        <article className="flex w-full flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center justify-center">
            <h1 className="font-heading text-foreground text-7xl font-semibold uppercase">
              404
            </h1>
            <p className="text-muted-foreground text-center">
              Página não encontrada.
            </p>
          </div>
          <Link href="/">
            <Button>Voltar para a página inicial</Button>
          </Link>
        </article>
      </section>
    </main>
  )
}
