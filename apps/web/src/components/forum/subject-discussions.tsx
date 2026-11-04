'use client'

import { ChatCircleIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useFeatures } from '@/contexts/features'
import { useSession } from '@/lib/auth/use-session'
import { useCanPost, useSubjectMessages } from '@/lib/forum/use-forum'
import { useNow } from '@/components/notifications/notification-item'
import { useCanModerate } from '@/lib/moderation/use-moderation'
import { titleCase } from '@/utils/title-case'

import { MessageItem, type ForumContext } from './message-item'

function Discussions({
  courseSlug,
  curriculumSlug,
  code,
}: {
  courseSlug: string
  curriculumSlug: string
  code: string
}) {
  const now = useNow()
  const canPost = useCanPost(courseSlug)
  const canModerate = useCanModerate(courseSlug)
  const messages = useSubjectMessages(courseSlug, code)
  const items = messages.data?.pages.flatMap((page) => page.items) ?? []
  const context: ForumContext = {
    courseSlug,
    curriculumSlug,
    curriculumLabel: null,
    canPost,
    canModerate,
  }
  if (messages.isPending) {
    return <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
  }
  if (messages.isError) {
    return (
      <p role="alert" className="p-4 text-sm">
        {messages.error.message}
      </p>
    )
  }
  if (items.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Ninguém citou esta disciplina no fórum ainda. Escreva @{code} numa
        mensagem para começar.
      </p>
    )
  }
  return (
    <div className="flex flex-col">
      <ul className="flex flex-col divide-y">
        {items.map((message) => (
          <li key={message.id}>
            <MessageItem message={message} context={context} now={now} />
          </li>
        ))}
      </ul>
      {messages.hasNextPage && (
        <Button
          variant="ghost"
          className="self-center"
          isLoading={messages.isFetchingNextPage}
          onClick={() => messages.fetchNextPage()}
        >
          Carregar mais
        </Button>
      )}
    </div>
  )
}

// Aba "Discussões" da disciplina: mensagens do fórum do curso que a citam.
// Só com a API e com login (o fórum exige login).
export function SubjectDiscussions({
  courseSlug,
  curriculumSlug,
  code,
  name,
}: {
  courseSlug: string
  curriculumSlug: string
  code: string
  name: string
}) {
  const { api } = useFeatures()
  const { data: user } = useSession()
  const [open, setOpen] = useState(false)
  if (!api || !user) return null
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <ChatCircleIcon aria-hidden className="size-4" />
          Discussões
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Discussões</SheetTitle>
          <SheetDescription>
            Mensagens do fórum que citam {titleCase(name)}.{' '}
            <Link
              href={`/${courseSlug}/forum`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Abrir o fórum
            </Link>
          </SheetDescription>
        </SheetHeader>
        {open && (
          <Discussions
            courseSlug={courseSlug}
            curriculumSlug={curriculumSlug}
            code={code}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
