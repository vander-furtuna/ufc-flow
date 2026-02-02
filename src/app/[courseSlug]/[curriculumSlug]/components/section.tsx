'use client'

import { useCallback, useEffect } from 'react'

import { CurriculumHeader } from '@/components/curriculum-header'
import { Header } from '@/components/header'
import { useCourse } from '@/contexts/course'

import { Footer } from './footer'
import { Sidebar } from './sidebar/sidebax'
import { SubjectDiagram } from './subject-diagram'
import { SubjectDiagramSkeleton } from './subject-diagram-skeleton'

type CurriculumProps = {
  params: {
    courseSlug: string
    curriculumSlug: string
  }
}

export function CurriculumSection({ params }: CurriculumProps) {
  const { courseSlug, curriculumSlug } = params

  const {
    selectedCourse,
    selectedCurriculum,
    selectCourseBySlug,
    selectCurriculumBySlug,
    isCourseLoading,
  } = useCourse()

  const handleGetSelectedCurriculumBySlug = useCallback(() => {
    // Garante que o curso selecionado sempre corresponde ao slug da URL
    if (!selectedCourse || selectedCourse.slug !== courseSlug) {
      selectCourseBySlug(courseSlug)
      return
    }

    // Depois que o curso correto estiver selecionado,
    // garante que o currículo também corresponda ao slug da URL
    if (!selectedCurriculum || selectedCurriculum.slug !== curriculumSlug) {
      selectCurriculumBySlug(curriculumSlug)
    }
  }, [
    courseSlug,
    curriculumSlug,
    selectedCourse,
    selectedCurriculum,
    selectCourseBySlug,
    selectCurriculumBySlug,
  ])

  useEffect(() => {
    handleGetSelectedCurriculumBySlug()
  }, [handleGetSelectedCurriculumBySlug])

  return (
    <>
      <section className="@container flex h-full min-h-dvh w-full max-w-5xl flex-col items-center justify-start gap-8 pt-12 pb-24">
        <Header />
        <CurriculumHeader />
        {isCourseLoading ? <SubjectDiagramSkeleton /> : <SubjectDiagram />}
        <Footer />
      </section>
      <Sidebar />
    </>
  )
}
