import { lighten, saturate } from 'polished'
import { useMemo } from 'react'

import { useCourse } from '@/app/contexts/course'

interface SubjectBarProps {
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
      return `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, '#f97316'))}, #f97316)`
    } else if (nature === 'OPTATIVA') {
      if (colors && colors?.length === 1) {
        return `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, colors[0]))}, ${colors[0]})`
      } else if (colors && colors?.length >= 2) {
        return `linear-gradient(90deg, ${colors.join(',')})`
      } else if (colors && colors?.length === 0) {
        return `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, '#7c3aed'))}, #7c3aed)`
      }
    }
    return ''
  }, [colors, nature])

  console.log({ nature })

  return (
    <>
      <div
        className={`h-2 w-8 rounded-[5rem] absolute bottom-2 group-hover:w-full group-hover:h-full group-hover:rounded-lg group-hover:bottom-0 ease-smooth transition-all duration-700 -z-10`}
        style={{
          background: backgroundStyle,
        }}
      />
      <div
        className={`h-2 w-8 rounded-[5rem] absolute bottom-2 group-hover:w-full group-hover:h-full group-hover:rounded-lg group-hover:bottom-0 ease-smooth transition-all duration-700 -z-[15] blur-lg`}
        style={{
          background: backgroundStyle,
        }}
      />
    </>
  )
}
