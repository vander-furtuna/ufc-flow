import { CurriculumSwitch } from './curriculum-switch'
import { CountdownButton } from './ui/countdowm-button'

export function CurriculumHeader() {
  return (
    <article className="flex w-full flex-col items-start justify-between gap-6 @4xl:flex-row">
      <div className="flex w-full flex-col gap-2 md:w-fit md:flex-row">
        <CurriculumSwitch />
        <CountdownButton />
      </div>
    </article>
  )
}
