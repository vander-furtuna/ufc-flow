import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/session'

import { hubCourse } from '../../hub/course'
import { ConversationPage } from './conversation-page'

type Props = { params: Promise<{ courseSlug: string; messageId: string }> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata: Metadata = {
  title: 'Conversa no fórum',
  robots: { index: false },
}

export default async function Page({ params }: Props) {
  const { courseSlug, messageId } = await params
  if (!UUID.test(messageId)) notFound()
  const [course, user] = await Promise.all([
    hubCourse(courseSlug),
    getCurrentUser(),
  ])
  if (!user) {
    redirect(
      `/entrar?next=${encodeURIComponent(`/${courseSlug}/forum/${messageId}`)}`,
    )
  }
  return <ConversationPage course={course} messageId={messageId} />
}
