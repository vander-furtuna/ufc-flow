'use client'

import { saveSlugToCookie } from '@/services/slug/save-slug'
import type { Course } from '@/types/course'
import { ChevronRight } from 'lucide-react'
import { useCallback, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import { Glow } from './glow'

type CourseLinkProps = {
  course: Course
  slug: string
  icon: IconName
} & ComponentProps<'button'>

export function CourseLink({ course, slug, icon, ...props }: CourseLinkProps) {
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

  return (
    <button
      key={course.id}
      type="button"
      onClick={() => handleSaveSlug(slug)}
      className="bg-accent border-border group/link relative flex h-20 cursor-pointer items-center justify-between overflow-hidden rounded-md border px-4"
      {...props}
    >
      <Glow
        className="absolute -left-12 z-0 size-24 opacity-0 blur-xl transition-all duration-500 group-hover/link:-left-8 group-hover/link:opacity-100"
        colors="#22d3ee"
      />

      <div className="z-20 flex items-center gap-4">
        <DynamicIcon
          name={icon}
          className="text-muted-foreground group-hover/link:text-foreground/90 size-8 transition-all"
        />
        <div className="flex flex-col justify-center">
          <strong className="font-medium">{course.name}</strong>
          <div className="flex gap-2">
            <span>{course.curriculumStructures[0].period}</span>
            <span>{course.curriculumStructures[0].city}</span>
          </div>
        </div>
      </div>
      <ChevronRight className="text-muted-foreground/70 group-hover/link:text-muted-foreground transition group-hover/link:translate-x-2" />
    </button>
  )
}
