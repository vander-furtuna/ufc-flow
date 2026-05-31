import { FloatingBar } from './components/floating-bar'
import { CurriculumSection } from './components/section'

type CurriculumProps = {
  params: Promise<{
    courseSlug: string
    curriculumSlug: string
  }>
}

export default async function Curriculum({ params }: CurriculumProps) {
  const loadedParams = await params

  return (
    <main className="flex h-full min-h-dvh w-full items-start justify-center gap-4 px-6 md:gap-12">
      <CurriculumSection params={loadedParams} />
      <FloatingBar />
      <div className="to-background fixed bottom-0 z-49 h-12 w-full bg-linear-to-b from-transparent"></div>
    </main>
  )
}
