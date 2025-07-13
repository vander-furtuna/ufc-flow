import { getSubjectsInformations } from '@/actions/scrapping/subjects/get-subjects-informations'

import { CurriculumSection } from './components/section'

interface CurriculumProps {
  params: Promise<{
    courseSlug: string
    curriculumSlug: string
  }>
}

export default async function Curriculum({ params }: CurriculumProps) {
  const loadedParams = await params

  const data = await getSubjectsInformations()

  return (
    <main className="flex h-full min-h-dvh w-full items-start justify-center gap-6 px-8 md:gap-12">
      <CurriculumSection params={loadedParams} />
    </main>
  )
}
