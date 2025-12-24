import { useMemo } from 'react'

import { useCourse } from '@/contexts/course'
import { COLORS } from '@/data/colors'
import { getGradientColor } from '@/utils/get-gradient-color'

type SubjectBarProps = {
  nature: string
  branch: string[]
}

export function SubjectBar({ nature, branch }: SubjectBarProps) {
  const { selectedCurriculum } = useCourse()

  const colors = useMemo(
    () =>
      selectedCurriculum?.branchs
        .filter((currentBranch) => branch.includes(currentBranch.id)) // Filtra apenas as branchs com ids presentes em branchsIds
        .map((branch) => branch.color),
    [selectedCurriculum, branch],
  )

  const backgroundStyle = useMemo(() => {
    if (nature === 'OBRIGATÓRIA') {
      return getGradientColor(COLORS.COMPULSORY)
    } else if (nature === 'OPTATIVA') {
      if (colors && colors?.length === 1) {
        return getGradientColor(colors[0])
      } else if (colors && colors?.length >= 2) {
        return `linear-gradient(90deg, ${colors.join(',')})`
      } else if (colors && colors?.length === 0) {
        return getGradientColor(COLORS.OPTIONAL)
      }
    }
    return ''
  }, [colors, nature])

  return (
    <>
      <div
        className={`ease-smooth absolute bottom-2 -z-10 h-2 w-8 rounded-[5rem] transition-all duration-700 group-hover:bottom-0 group-hover:h-full group-hover:w-full group-hover:rounded-lg group-data-[selected=selected]:bottom-0 group-data-[selected=selected]:h-full group-data-[selected=selected]:w-full group-data-[selected=selected]:rounded-lg`}
        style={{
          background: backgroundStyle,
        }}
      />
      <div
        className={`ease-smooth absolute bottom-2 -z-15 h-2 w-8 rounded-[5rem] opacity-70 blur-lg transition-all duration-700 group-hover:bottom-0 group-hover:h-full group-hover:w-full group-hover:rounded-lg group-data-[selected=selected]:bottom-0 group-data-[selected=selected]:h-full group-data-[selected=selected]:w-full group-data-[selected=selected]:rounded-lg`}
        style={{
          background: backgroundStyle,
        }}
      />
    </>
  )
}
