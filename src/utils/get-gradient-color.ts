import { lighten, saturate } from 'polished'

export function getGradientColor(color: string, degree: number = 90) {
  return `linear-gradient(${degree}deg, ${saturate(0.8, lighten(0.15, color))}, ${color})`
}
