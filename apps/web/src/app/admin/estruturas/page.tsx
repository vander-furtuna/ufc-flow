import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import type { CourseDetail } from '@ufc-flow/contracts'
import type { Metadata } from 'next'
import Link from 'next/link'

import { CURRENT_CHIP, formatDate, STATUS_CHIP } from '@/data/catalog-labels'
import { adminPage } from '@/lib/catalog/admin-api'

import { Chip, PageHeader } from '../_components/page-header'
import { CreateCurriculumButton } from './create-curriculum-button'

export const metadata: Metadata = { title: 'Estruturas curriculares' }

export default async function CurriculaPage() {
  const courses = await adminPage<CourseDetail[]>(
    '/v1/manage/courses',
    '/admin/estruturas',
  )

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Estruturas curriculares"
        description="Rascunhos importados pela extensão e estruturas publicadas dos cursos que você gerencia."
      />
      {courses.length === 0 && (
        <p className="rounded-xl border bg-background p-6 text-muted-foreground">
          Nenhum curso por aqui ainda.
        </p>
      )}
      {courses.map((course) => (
        <section
          key={course.id}
          aria-labelledby={`course-${course.id}`}
          className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id={`course-${course.id}`}
                className="font-clash text-xl font-semibold"
              >
                {course.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {course.campus.name} · SIGAA {course.sigaaId}
              </p>
            </div>
            <CreateCurriculumButton courseId={course.id} />
          </div>
          {course.curricula.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma estrutura. Envie pela extensão no SIGAA ou crie à mão.
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-xl border">
              {course.curricula.map((curriculum) => (
                <li key={curriculum.id}>
                  <Link
                    href={`/admin/estruturas/${curriculum.id}`}
                    className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="font-medium">
                      Estrutura {curriculum.code}
                    </span>
                    <Chip className={STATUS_CHIP[curriculum.status].className}>
                      {STATUS_CHIP[curriculum.status].label}
                    </Chip>
                    {curriculum.isCurrent && (
                      <Chip className={CURRENT_CHIP}>Vigente</Chip>
                    )}
                    {curriculum.needsReimport && (
                      <Chip className="bg-muted text-muted-foreground">
                        Reimportar pela extensão
                      </Chip>
                    )}
                    <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      /{course.slug}/{curriculum.slug} · atualizada em{' '}
                      {formatDate(curriculum.updatedAt)}
                      <CaretRightIcon className="size-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
