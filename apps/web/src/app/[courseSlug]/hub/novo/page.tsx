import type { Metadata } from 'next'

import { emptyPostForm } from '@/lib/hub/post-form'

import { PostFormPage } from '../post-form-page'

export const metadata: Metadata = {
  title: 'Novo post',
  robots: { index: false },
}

export default async function Page({
  params,
}: {
  params: Promise<{ courseSlug: string }>
}) {
  const { courseSlug } = await params
  return (
    <PostFormPage
      courseSlug={courseSlug}
      path={`/${courseSlug}/hub/novo`}
      title="Novo post"
      initial={emptyPostForm()}
    />
  )
}
