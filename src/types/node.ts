export type NodeData = {
  label: string
  code: string
  type: string
  nature: string
  isPrerequisite?: boolean
  isUnlocked?: boolean
  isSelected?: boolean
  isNeighbor?: boolean // Direct neighbor of hovered
  neighborType?: 'prerequisite' | 'unlocked' | null
  branchIds?: string[]
}
