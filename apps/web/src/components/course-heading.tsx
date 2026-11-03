'use client'

import {
  CaretUpDownIcon,
  HourglassIcon,
  MapPinIcon,
} from '@phosphor-icons/react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { CourseTabs } from './course-tabs'

export type CourseHeadingData = {
  slug: string
  name: string
  curriculum: { slug: string; period: string; city: string } | null
}

function Pill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-accent px-2.5 text-sm font-medium">
      {icon}
      {label}
    </span>
  )
}

// Cabeçalho das telas do curso fora da grade (mockups Hub e Forum): nome,
// trocar curso, a EC vigente e as abas Grade, Hub e Fórum
export function CourseHeading({
  course,
  current,
}: {
  course: CourseHeadingData
  current: 'hub' | 'forum'
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium uppercase">Curso:</span>
      <div className="flex items-start justify-between gap-2 sm:justify-start">
        <h1 className="font-clash text-3xl font-semibold text-accent-foreground">
          {course.name}
        </h1>
        <Link
          href="/cursos"
          aria-label="Trocar curso"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <CaretUpDownIcon className="size-5" />
        </Link>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {course.curriculum && (
          <div className="flex flex-wrap gap-2">
            <Pill
              icon={<HourglassIcon aria-hidden className="size-4" />}
              label={course.curriculum.period}
            />
            <Pill
              icon={<MapPinIcon aria-hidden className="size-4" />}
              label={course.curriculum.city}
            />
          </div>
        )}
        <CourseTabs
          courseSlug={course.slug}
          curriculumSlug={course.curriculum?.slug}
          current={current}
          className="sm:ml-auto"
        />
      </div>
    </div>
  )
}
