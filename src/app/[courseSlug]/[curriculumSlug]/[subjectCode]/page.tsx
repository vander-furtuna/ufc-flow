'use client'

import { useCourse } from '@/contexts/course'
import { SubjectView } from './components/subject-view'
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FlowLoading } from '@/components/flow-loading'

type SubjectPageProps = {
  params: Promise<{
    courseSlug: string
    curriculumSlug: string
    subjectCode: string
  }>
}

export default function SubjectPage({ params }: SubjectPageProps) {
  const router = useRouter()

  const { courseSlug, curriculumSlug, subjectCode } = use(params)

  const { selectedCurriculum, selectedSubject, handleSelect } = useCourse()

  useEffect(() => {
    if (!selectedSubject) {
      handleSelect({ courseSlug, curriculumSlug, subjectCode })
    }
  }, [courseSlug, curriculumSlug, subjectCode, selectedSubject, handleSelect])

  return (
    <section className="relative w-dvw flex-1 overflow-hidden">
      {selectedSubject && selectedCurriculum ? (
        <SubjectView
          subject={selectedSubject}
          allSubjects={selectedCurriculum.subjects}
          branches={selectedCurriculum.branchs}
          onBack={() => router.back()}
        />
      ) : (
        <div className="flex h-dvh w-full items-center justify-center">
          <FlowLoading className="size-20" />
        </div>
      )}
    </section>
  )
}
