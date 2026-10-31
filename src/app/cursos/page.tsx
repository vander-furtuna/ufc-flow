'use client'

import { CourseLink } from '@/components/couse-link'
import { Header } from '@/components/header'
import { Line } from '@/components/title'
import { COURSES_DATA } from '@/data/courses'
import { StarIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { AppSearchBar } from '@/components/app-search-bar'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCourses = COURSES_DATA.filter((course) => {
    const query = searchQuery.toLowerCase()
    return course.name.toLowerCase().includes(query) && course.isActive
  })

  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-6 pt-12 pb-24">
      <section className="flex w-full max-w-4xl flex-col gap-12">
        <Header />

        <article className="flex w-full flex-col items-center gap-4">
          <div className="flex w-full items-center gap-6">
            <Line />
            <h1 className="font-clash text-foreground text-2xl font-semibold text-nowrap uppercase md:text-3xl">
              Escolha um curso
            </h1>
            <Line />
          </div>
          <div className="flex w-full items-center justify-start gap-1.5">
            <StarIcon weight="bold" className="text-foreground size-5" />
            <span>Grade Vigente</span>
          </div>
          <div className="grid w-full grid-flow-row grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredCourses.map((course) => (
              <CourseLink icon={course.icon} key={course.id} course={course} />
            ))}
          </div>
        </article>
      </section>

      <div className="fixed bottom-8 left-0 z-50 flex w-full justify-center px-4">
        <AppSearchBar
          placeholder="Pesquisar curso"
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          currentNavId="cursos"
        />
      </div>
      <div className="to-background pointer-events-none fixed bottom-0 z-49 h-12 w-full bg-linear-to-b from-transparent" />
    </main>
  )
}
