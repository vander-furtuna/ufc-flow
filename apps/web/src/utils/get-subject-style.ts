import { COLORS, NATURE_COLORS } from '@/data/colors'
import type { Nature } from '@/types/course'
import { getGradientColor } from './get-gradient-color'

export function getSubjectStyle(
  colors?: string[],
  nature?: string,
  degree = 90,
) {
  if (nature === 'OBRIGATÓRIA') {
    return getGradientColor(COLORS.COMPULSORY, degree)
  } else if (nature === 'OPTATIVA') {
    if (colors && colors?.length === 1) {
      return getGradientColor(colors[0], degree)
    } else if (colors && colors?.length >= 2) {
      return `linear-gradient(${degree}deg, ${colors.join(',')})`
    } else if (colors && colors?.length === 0) {
      return getGradientColor(COLORS.OPTIONAL, degree)
    }
  } else if (nature) {
    const color = NATURE_COLORS[nature as Nature]
    if (color) {
      return getGradientColor(color, degree)
    }
  }
  return ''
}
