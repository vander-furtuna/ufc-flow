import type { Nature, SubjectType } from '@/types/course'

export type NodeData = {
  label: string
  code: string
  type: SubjectType
  nature: Nature
  isPrerequisite?: boolean
  isUnlocked?: boolean
  isSelected?: boolean
  isNeighbor?: boolean // Direct neighbor of hovered
  neighborType?: 'prerequisite' | 'unlocked' | null
  branchIds?: string[]
}
