import { useMemo } from 'react'

import { CurriculumSwitch } from './curriculum-switch'
import { NewUrlLink } from './new-url-link'

export function CurriculumHeader() {
  const isUrlLinkEnabled = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SITE_URL &&
      !window.location.href.includes(process.env.NEXT_PUBLIC_SITE_URL),
    [],
  )

  return (
    <article className="flex w-full flex-col items-start justify-between gap-6 @4xl:flex-row">
      <div className="flex w-full flex-col gap-2 md:w-fit md:flex-row">
        <CurriculumSwitch />
        {isUrlLinkEnabled && <NewUrlLink />}
      </div>
    </article>
  )
}
