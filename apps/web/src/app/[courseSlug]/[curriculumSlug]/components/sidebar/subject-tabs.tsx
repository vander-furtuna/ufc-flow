'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { EvaluationPanel } from '@/components/evaluation/evaluation-panel'
import { SubjectDiscussionList } from '@/components/forum/subject-discussions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFeatures } from '@/contexts/features'
import { useSession } from '@/lib/auth/use-session'
import { cn } from '@/lib/utils'

const trigger =
  'h-9 flex-1 rounded-xl text-[13px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'

// Abas do painel da disciplina (mockups Disciplina-Avaliacao e
// Mobile-Disciplina). Sem a API, só os detalhes, como antes.
export function SubjectTabs({
  code,
  details,
}: {
  code: string
  details: ReactNode
}) {
  const { api } = useFeatures()
  const { data: user } = useSession()
  const params = useParams<{ courseSlug: string; curriculumSlug: string }>()
  const pathname = usePathname()
  const [tab, setTab] = useState('details')
  if (!api) return <>{details}</>

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="relative z-20 mt-6 w-full"
    >
      <div className="px-3">
        <TabsList className="h-auto w-full rounded-2xl border bg-background p-1">
          <TabsTrigger value="details" className={trigger}>
            Detalhes
          </TabsTrigger>
          <TabsTrigger value="evaluations" className={trigger}>
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="discussions" className={trigger}>
            Discussões
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="details" className="mt-0">
        {details}
      </TabsContent>
      <TabsContent value="evaluations" className="mt-4 px-3">
        {tab === 'evaluations' && <EvaluationPanel code={code} />}
      </TabsContent>
      <TabsContent value="discussions" className={cn('mt-2 px-3')}>
        {tab === 'discussions' &&
          (user ? (
            <div className="flex flex-col gap-2">
              <SubjectDiscussionList
                courseSlug={params.courseSlug}
                curriculumSlug={params.curriculumSlug}
                code={code}
              />
              <Link
                href={`/${params.courseSlug}/forum`}
                className="self-start text-sm font-semibold underline underline-offset-2"
              >
                Abrir o fórum
              </Link>
            </div>
          ) : (
            <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">
              <Link
                href={`/entrar?next=${encodeURIComponent(pathname)}`}
                className="font-semibold text-foreground underline underline-offset-2"
              >
                Entre
              </Link>{' '}
              para ver as mensagens do fórum que citam esta disciplina.
            </p>
          ))}
      </TabsContent>
    </Tabs>
  )
}
