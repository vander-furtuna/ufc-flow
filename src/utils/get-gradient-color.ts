import { lighten, saturate } from 'polished'

export function getGradientColor(color: string) {
  return `linear-gradient(90deg, ${saturate(0.8, lighten(0.15, color))}, ${color})`
}
