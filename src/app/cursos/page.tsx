import { CourseLink } from '@/components/couse-link'
import { Header } from '@/components/header'
import { COURSES_DATA } from '@/data/courses'

export default function Home() {
  return (
    <main className="flex min-h-dvh w-full justify-center-safe px-6 pt-12 pb-24">
      <section className="flex w-full max-w-4xl flex-col gap-12">
        <Header />

        <article className="flex w-full flex-col items-center gap-2">
          <h1 className="font-clash text-foreground text-3xl font-semibold uppercase">
            Escolha um curso
          </h1>
          <div className="grid w-full grid-flow-row grid-cols-1 gap-4 lg:grid-cols-2">
            {COURSES_DATA.map((course) => (
              <CourseLink
                key={course.id}
                course={course}
                slug={`/${course.slug}/${course.curriculumStructures[0].slug}`}
              />
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}
