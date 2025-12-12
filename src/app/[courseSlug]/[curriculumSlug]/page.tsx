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

  console.log('Loaded Params:', loadedParams)

  return (
    <main className="flex h-full min-h-dvh w-full items-start justify-center gap-6 px-6 md:gap-12">
      <CurriculumSection params={loadedParams} />
      <FloatingBar />
    </main>
  )
}
