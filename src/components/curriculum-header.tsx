import { useCourse } from '@/app/contexts/course'

import { SearchBar } from './search-bar'
import { ToggleButton } from './toggle-button'

export function CurriculumHeader() {
  const { selectedCurriculum, selectedCourse } = useCourse()

  return (
    <section className="w-full justify-between items-start flex">
      <div className="flex gap-2">
        <ToggleButton label={selectedCourse?.name} />
        <ToggleButton label={selectedCurriculum?.period} />
      </div>
      <div>
        <SearchBar />
      </div>
    </section>
  )
}
