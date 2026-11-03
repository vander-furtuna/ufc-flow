'use client'

import Link from 'next/link'

import { FORUM_LIMITS } from '@ufc-flow/contracts'

import { useTrending } from '@/lib/forum/use-forum'
import { titleCase } from '@/utils/title-case'

const panel = 'flex flex-col gap-3 rounded-2xl border bg-muted/60 p-5'

export function TrendingSubjects({
  courseSlug,
  curriculumSlug,
}: {
  courseSlug: string
  curriculumSlug: string | null
}) {
  const { data: subjects } = useTrending(courseSlug)
  if (!subjects || subjects.length === 0) return null
  return (
    <section aria-labelledby="forum-trending" className={panel}>
      <h2 id="forum-trending" className="font-clash text-lg font-semibold">
        Mais citadas na semana
      </h2>
      <ol className="flex flex-col gap-1">
        {subjects.map((subject) => {
          const content = (
            <>
              <span
                aria-hidden
                className="h-9 w-1 shrink-0 rounded-full bg-orange-500"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">
                  {titleCase(subject.name)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {subject.code}
                </span>
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {subject.count}
              </span>
            </>
          )
          return (
            <li key={subject.code}>
              {curriculumSlug ? (
                <Link
                  href={`/${courseSlug}/${curriculumSlug}/${subject.code}`}
                  className="flex items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-1 py-1.5">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        Número de mensagens que citam a disciplina.
      </p>
    </section>
  )
}

export function ForumRules() {
  return (
    <section
      aria-labelledby="forum-rules"
      className="flex flex-col gap-3 rounded-2xl border p-5"
    >
      <h2 id="forum-rules" className="font-clash text-lg font-semibold">
        Combinados
      </h2>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
        <li>Nada de dados pessoais de colegas ou professores.</li>
        <li>Respeito acima de tudo; denuncie o que passar do ponto.</li>
        <li>
          Você edita uma mensagem por até {FORUM_LIMITS.editMinutes} minutos.
        </li>
      </ul>
    </section>
  )
}
