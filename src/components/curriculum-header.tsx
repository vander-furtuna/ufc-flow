import { CurriculumSwitch } from './curriculum-switch'
import { SearchBar } from './search-bar'

export function CurriculumHeader() {
  return (
    <article className="flex w-full flex-col items-start justify-between gap-6 @4xl:flex-row">
      <div className="flex w-full gap-2 md:w-fit">
        <CurriculumSwitch />
      </div>
      <div className="flex w-full justify-end">
        <SearchBar />
      </div>
    </article>
  )
}
