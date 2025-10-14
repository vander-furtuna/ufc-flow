import { Hourglass, MapPin } from 'lucide-react'
import { type ComponentProps, type JSX } from 'react'

import { useCourse } from '@/contexts/course'
import { cn } from '@/lib/utils'

type CurriculumInformationsProps = ComponentProps<'div'>

type InfoPillProps = {
  label: string
  icon: JSX.Element
}
function InfoPill({ label, icon: Icon }: InfoPillProps) {
  return (
    <div className="bg-accent border-border flex size-fit items-center gap-1.5 rounded-full border px-2.5 py-1">
      {Icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export function CurriculumInformations({
  className,
  ...rest
}: CurriculumInformationsProps) {
  const { selectedCourse, selectedCurriculum } = useCourse()

  return (
    <div
      className={cn(
        'flex flex-col items-start justify-center gap-2',
        className,
      )}
      {...rest}
    >
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase">Curso:</span>
        <strong className="font-clash text-accent-foreground text-3xl font-semibold">
          {selectedCourse?.name}
        </strong>
      </div>

      {selectedCurriculum && (
        <div className="flex gap-1">
          <InfoPill
            label={selectedCurriculum?.period}
            icon={<Hourglass className="text-accent-foreground/80 size-4" />}
          />
          <InfoPill
            label={selectedCurriculum?.city}
            icon={<MapPin className="text-accent-foreground/80 size-4" />}
          />
        </div>
      )}
    </div>
  )
}
