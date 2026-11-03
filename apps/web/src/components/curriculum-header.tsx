import { useCourse } from '@/contexts/course'

import { CourseTabs } from './course-tabs'
import { CurriculumInformations } from './curriculum-informations'

export function CurriculumHeader() {
  const { selectedCourse, selectedCurriculum } = useCourse()

  return (
    <article className="flex w-full flex-col items-start justify-between gap-6 @4xl:flex-row @4xl:items-end">
      <div className="flex w-full items-center gap-4">
        <CurriculumInformations />
      </div>
      {selectedCourse && (
        <CourseTabs
          courseSlug={selectedCourse.slug}
          curriculumSlug={selectedCurriculum?.slug}
          current="grade"
          className="shrink-0"
        />
      )}
    </article>
  )
}
