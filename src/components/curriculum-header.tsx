import { CurriculumSwitch } from './curriculum-switch'

export function CurriculumHeader() {
  return (
    <article className="flex w-full flex-col items-start justify-between gap-6 @4xl:flex-row">
      <div className="flex w-full gap-2 md:w-fit">
        <CurriculumSwitch />
      </div>
    </article>
  )
}
