import { ChevronDown, ChevronsUpDown, Hourglass, MapPin } from 'lucide-react'
import { useState, type ComponentProps, type JSX } from 'react'

import { useCourse } from '@/contexts/course'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import Link from 'next/link'
import { SubjectTypeSubtitle } from '@/app/[courseSlug]/[curriculumSlug]/components/subject-type-subtitle'
import { AnimatePresence, motion } from 'motion/react'

type CurriculumInformationsProps = ComponentProps<'div'>

type InfoPillProps = {
  label: string
  icon: JSX.Element
  postIcon?: JSX.Element
} & ComponentProps<'button'>
function InfoPill({
  label,
  icon: Icon,
  postIcon,
  className,
  ...rest
}: InfoPillProps) {
  return (
    <button
      className={cn(
        'bg-accent border-border flex size-fit cursor-pointer items-center gap-0.5 rounded-full border px-2 py-1 pl-1.5',
        className,
        postIcon && 'pr-1.5',
      )}
      {...rest}
    >
      <div className="flex items-center gap-1">
        {Icon}
        <span className="text-sm font-medium text-nowrap">{label}</span>
      </div>
      {postIcon}
    </button>
  )
}

export function CurriculumInformations({
  className,
  ...rest
}: CurriculumInformationsProps) {
  const [showBranchs, setShowBranchs] = useState(false)
  const { selectedCourse, selectedCurriculum } = useCourse()

  return (
    <div
      className={cn(
        'flex w-full flex-col items-start justify-center gap-2',
        className,
      )}
      {...rest}
    >
      <div className="flex w-full items-center gap-2">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase">Curso:</span>
          <strong className="font-clash text-accent-foreground text-3xl font-semibold">
            {selectedCourse?.name}
          </strong>
        </div>
        <Link href="/cursos">
          <Button variant="ghost" size="icon">
            <ChevronsUpDown className="text-muted-foreground/70 size-5" />
          </Button>
        </Link>
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
          <InfoPill
            label="Vertentes"
            icon={<MapPin className="text-accent-foreground/80 size-4" />}
            postIcon={
              <ChevronDown className="text-muted-foreground/70 size-4" />
            }
            onClick={() => setShowBranchs(!showBranchs)}
          />
        </div>
      )}

      <AnimatePresence>
        {showBranchs && (
          <motion.div
            className="flex w-full flex-col items-start justify-start gap-2"
            initial={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
            exit={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.2 }}
          >
            <SubjectTypeSubtitle />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
