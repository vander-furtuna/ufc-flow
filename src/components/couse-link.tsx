'use client'

import { saveSlugToCookie } from '@/services/slug/save-slug'
import type { Course } from '@/types/course'
import { ChevronRight, Hourglass, MapPin, Star } from 'lucide-react'
import { useCallback, useState, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import { AnimatePresence, motion } from 'motion/react'
import { Glow } from './glow'
import { cn } from '@/lib/utils'

type CourseLinkProps = {
  course: Course
  icon: IconName
} & ComponentProps<'button'>

export function CourseLink({ course, icon, ...props }: CourseLinkProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { push } = useRouter()

  const handleSaveSlug = useCallback(
    async (slug: string) => {
      try {
        push(slug)
        await saveSlugToCookie(slug)
      } catch (error) {
        console.error('Error saving slug to cookie:', error)
      }
    },
    [push],
  )

  const hasOneStructure = course.curriculumStructures.length === 1

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-md transition-all',
        isOpen && 'bg-accent/60',
      )}
    >
      <button
        key={course.id}
        type="button"
        onClick={() =>
          hasOneStructure
            ? handleSaveSlug(
                `/${course.slug}/${course.curriculumStructures[0].slug}`,
              )
            : setIsOpen(!isOpen)
        }
        className="bg-accent border-border group/link relative flex h-24 cursor-pointer items-center justify-between overflow-hidden rounded-md border px-4"
        {...props}
      >
        <Glow
          className={cn(
            'absolute -left-12 z-0 size-24 opacity-0 blur-xl transition-all duration-500 group-hover/link:-left-8 group-hover/link:opacity-100',
            isOpen && '-left-8 opacity-100',
          )}
          colors={course.color ?? '#22d3ee'}
        />

        <div className="z-20 flex items-center gap-4">
          <DynamicIcon
            name={icon}
            className={cn(
              'text-muted-foreground group-hover/link:text-foreground/90 size-8 transition-all',
              isOpen && 'text-foreground/90',
            )}
          />
          <div className="flex flex-col items-start justify-center gap-1">
            <strong className="font-clash text-left text-xl leading-tight font-medium">
              {course.name}
            </strong>
            <div className="flex gap-0.5 text-left text-sm">
              {hasOneStructure && (
                <span className="bg-background/30 border-border/50 flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <Hourglass className="size-4" />
                  {course.curriculumStructures[0].period}
                </span>
              )}
              <span className="border-border/50 bg-background/30 flex items-center gap-1 rounded-full border px-2 py-0.5">
                <MapPin className="size-4" />
                {course.curriculumStructures[0].city}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight
          className={cn(
            'text-muted-foreground/70 group-hover/link:text-muted-foreground transition group-hover/link:translate-x-2',
            isOpen && 'rotate-90',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <ul className="flex flex-wrap gap-1 px-4 py-3">
              {course.curriculumStructures.map((structure) => (
                <li key={structure.id}>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveSlug(`/${course.slug}/${structure.slug}`)
                    }
                    className="bg-accent border-border group/link relative flex cursor-pointer items-center justify-between gap-1 overflow-hidden rounded-full border py-0.5 pr-1.5 pl-3"
                  >
                    {structure.isCurrent && (
                      <Star className="text-foreground size-4" />
                    )}
                    <strong className="font-clash text-left text-lg leading-tight font-medium">
                      {structure.period}
                    </strong>
                    <ChevronRight className="text-muted-foreground/70 group-hover/link:text-muted-foreground size-4 transition group-hover/link:translate-x-1" />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
