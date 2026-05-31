import { CurriculumInformations } from './curriculum-informations'
import { useRouter } from 'next/navigation'

export function CurriculumHeader() {
  const router = useRouter()

  return (
    <article className="flex w-full flex-col items-start justify-between gap-6 @4xl:flex-row">
      <div className="flex w-full items-center gap-4">
        <CurriculumInformations />
      </div>
    </article>
  )
}
