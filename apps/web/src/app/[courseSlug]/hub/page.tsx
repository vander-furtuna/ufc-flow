import type { Metadata } from 'next'

import { hubCourse } from './course'
import { HubPage } from './hub-page'

type Props = { params: Promise<{ courseSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await hubCourse((await params).courseSlug)
  return {
    title: `Hub · ${course.name}`,
    description: `Notícias, eventos, bolsas, projetos de extensão e editais de ${course.name}.`,
  }
}

export default async function Page({ params }: Props) {
  const course = await hubCourse((await params).courseSlug)
  return <HubPage course={course} />
}
