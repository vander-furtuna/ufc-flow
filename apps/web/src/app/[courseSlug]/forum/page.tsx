import type { Metadata } from 'next'
import Link from 'next/link'

import { Header } from '@/components/header'
import { getCurrentUser } from '@/lib/auth/session'

import { hubCourse } from '../hub/course'
import { ForumPage } from './forum-page'

type Props = { params: Promise<{ courseSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await hubCourse((await params).courseSlug)
  return { title: `Fórum · ${course.name}`, robots: { index: false } }
}

// Ler o fórum exige login (Matriz de permissões); sem ele, o convite para
// entrar. Sem API_URL, o fórum não existe (D51).
export default async function Page({ params }: Props) {
  const { courseSlug } = await params
  const [course, user] = await Promise.all([
    hubCourse(courseSlug),
    getCurrentUser(),
  ])
  if (user) return <ForumPage course={course} />
  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        <Header />
        <section className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border p-8 text-center">
          <h1 className="font-clash text-2xl font-semibold">
            Fórum de {course.name}
          </h1>
          <p className="text-muted-foreground">
            Entre na sua conta para ler e conversar com o curso.
          </p>
          <Link
            href={`/entrar?next=${encodeURIComponent(`/${course.slug}/forum`)}`}
            className="inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Entrar
          </Link>
        </section>
      </div>
    </main>
  )
}
