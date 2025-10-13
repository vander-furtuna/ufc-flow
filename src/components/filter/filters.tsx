import { BranchPopup } from './popups/branch-popup'
import { DurationPopup } from './popups/duration-popup'
import { SemesterPopup } from './popups/semester-popup'

type FiltersProps = {
  isOpen?: boolean
}

export function Filters({ isOpen }: FiltersProps) {
  return (
    <div
      className="ease-smooth mr-0 flex h-8 max-w-0 shrink-0 items-center gap-2 overflow-hidden opacity-0 transition-all duration-500 data-[open=open]:mr-2 data-[open=open]:max-w-32 data-[open=open]:opacity-100"
      data-open={isOpen ? 'open' : 'closed'}
    >
      <BranchPopup />
      <DurationPopup />
      <SemesterPopup />
    </div>
  )
}
