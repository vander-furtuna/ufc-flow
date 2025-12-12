'use client'

import { saveSlugToCookie } from '@/services/slug/save-slug'
import type { Course } from '@/types/course'
import { ChevronRight, NotebookText } from 'lucide-react'
import { useCallback, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'

type CourseLinkProps = {
  course: Course
  slug: string
} & ComponentProps<'button'>

export function CourseLink({ course, slug, ...props }: CourseLinkProps) {
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
      className="bg-accent border-border flex h-20 items-center justify-between rounded-md border px-4"
      {...props}
    >
      <div className="flex items-center gap-4">
        <NotebookText className="text-muted-foreground size-6" />
        <div className="flex flex-col justify-center">
          <strong className="font-medium">{course.name}</strong>
          <div className="flex gap-2">
            <span>{course.curriculumStructures[0].period}</span>
            <span>{course.curriculumStructures[0].city}</span>
          </div>
        </div>
      </div>
      <ChevronRight className="text-muted-foreground" />
    </button>
  )
}
