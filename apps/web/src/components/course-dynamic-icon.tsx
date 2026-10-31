'use client'

import type { CourseIconName } from '@/types/course'
import {
  BrainIcon,
  CoinsIcon,
  CpuIcon,
  CurrencyDollarIcon,
  GraduationCapIcon,
  LightningIcon,
  MusicNotesIcon,
  type IconProps,
} from '@phosphor-icons/react'
import type { ComponentType } from 'react'

const COURSE_ICONS_MAP: Record<string, ComponentType<IconProps>> = {
  cpu: CpuIcon,
  zap: LightningIcon,
  brain: BrainIcon,
  coins: CoinsIcon,
  'dollar-sign': CurrencyDollarIcon,
  music: MusicNotesIcon,
}

export interface CourseDynamicIconProps extends IconProps {
  name: CourseIconName
}

export function CourseDynamicIcon({
  name,
  weight = 'bold',
  ...props
}: CourseDynamicIconProps) {
  const IconComponent = COURSE_ICONS_MAP[name] ?? GraduationCapIcon
  return <IconComponent weight={weight} {...props} />
}
