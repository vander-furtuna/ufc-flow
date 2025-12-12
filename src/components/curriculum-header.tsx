import { ChevronsUpDown } from 'lucide-react'
import { CurriculumInformations } from './curriculum-switch'
import { Button } from './ui/button'
import { useRouter } from 'next/navigation'

export function CurriculumHeader() {
  const router = useRouter()

  return (
    <article className="flex w-full flex-col items-start justify-between gap-6 @4xl:flex-row">
      <div className="flex w-full items-center gap-4">
        <CurriculumInformations />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/cursos')}
        >
          <ChevronsUpDown className="text-muted-foreground/70 size-5" />
        </Button>
      </div>
    </article>
  )
}
