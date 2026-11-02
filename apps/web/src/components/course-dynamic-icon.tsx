'use client'

import type { CourseIconName } from '@/types/course'
import {
  BooksIcon,
  BrainIcon,
  BuildingsIcon,
  CodeIcon,
  CoinsIcon,
  CpuIcon,
  CurrencyDollarIcon,
  FlaskIcon,
  GraduationCapIcon,
  LeafIcon,
  LightningIcon,
  MusicNotesIcon,
  ScalesIcon,
  StethoscopeIcon,
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
  code: CodeIcon,
  flask: FlaskIcon,
  leaf: LeafIcon,
  stethoscope: StethoscopeIcon,
  scales: ScalesIcon,
  buildings: BuildingsIcon,
  books: BooksIcon,
}

// Ícones que o admin escolhe ao criar um curso
export const COURSE_ICON_NAMES = Object.keys(COURSE_ICONS_MAP)

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
