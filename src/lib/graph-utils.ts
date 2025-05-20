import type { Edge, Node } from '@xyflow/react'
// AreaOfStudy and areaDetails are removed as 'area' is no longer part of Subject
import type React from 'react'

import type { Subject } from '@/types/course'

interface SubjectNodeData {
  label: string
  // area: AreaOfStudy; // Removed
  duration: number // Changed from credits
  color: string // Will use default theme colors
  textColor: string // Will use default theme colors
  id: string // Subject ID
  code: string // Subject code
}

export type SubjectNode = Node<SubjectNodeData>

const nodeWidth = 170
const nodeHeight = 90 // Adjusted height for potentially more text
const horizontalSpacing = 80
const verticalSpacing = 100

export function generateFlowData(
  selectedSubjectId: string,
  allSubjects: Subject[],
): { nodes: SubjectNode[]; edges: Edge[] } {
  const nodes: SubjectNode[] = []
  const edges: Edge[] = []
  const processedNodes = new Set<string>() // Stores subject IDs

  const getSubjectById = (id: string): Subject | undefined =>
    allSubjects.find((s) => s.id === id)
  const getSubjectByCode = (code: string): Subject | undefined =>
    allSubjects.find((s) => s.code === code)

  // Helper to get theme colors safely
  const getThemeColor = (
    variableName: string,
    fallback: string = '#000000',
  ): string => {
    if (typeof document === 'undefined') return fallback // SSR safety
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim()
    return value || fallback
  }

  const defaultNodeBg = getThemeColor('--card', 'hsl(0 0% 100%)')
  const defaultNodeFg = getThemeColor('--card-foreground', 'hsl(0 0% 3.9%)')

  function addNode(
    subject: Subject,
    level: number,
    category: 'prerequisite' | 'selected' | 'unlock',
    xOffsetIndex: number,
  ): void {
    if (processedNodes.has(subject.id)) return

    processedNodes.add(subject.id)

    let yPosition: number
    if (category === 'selected') {
      yPosition = 0
    } else if (category === 'prerequisite') {
      yPosition = -level * (nodeHeight + verticalSpacing)
    } else {
      // unlock
      yPosition = level * (nodeHeight + verticalSpacing)
    }

    const xPosition =
      xOffsetIndex * (nodeWidth + horizontalSpacing) -
      ((level > 1 ? level - 1 : 0) * (nodeWidth + horizontalSpacing)) / 2

    const selectedBorderColor = getThemeColor('--ring', 'blue')
    const prerequisiteBorderColor = getThemeColor('--accent', 'purple')
    const unlockBorderColor = getThemeColor('--primary', 'green')
    const defaultBorderColor = getThemeColor('--border', 'grey')

    const nodeStyle: React.CSSProperties = {
      background: defaultNodeBg,
      color: defaultNodeFg,
      width: nodeWidth,
      height: nodeHeight,
      display: 'flex',
      flexDirection: 'column', // Allow stacking of name and duration
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      borderRadius: '0.5rem',
      borderWidth: '2px',
      borderColor: defaultBorderColor,
      borderStyle: 'solid',
      boxShadow: 'none',
      padding: '8px', // Add some padding
    }

    if (category === 'selected') {
      nodeStyle.borderColor = selectedBorderColor
      nodeStyle.borderWidth = '3px'
      nodeStyle.boxShadow = `0 0 8px ${selectedBorderColor}`
    } else if (category === 'prerequisite') {
      nodeStyle.borderStyle = 'dashed'
      nodeStyle.borderColor = prerequisiteBorderColor
    } else if (category === 'unlock') {
      nodeStyle.borderColor = unlockBorderColor
    }

    nodes.push({
      id: subject.id,
      type: 'default',
      data: {
        label: `${subject.name}\n(${subject.code})\n${subject.duration} hrs`,
        duration: subject.duration,
        color: nodeStyle.background as string,
        textColor: nodeStyle.color as string,
        id: subject.id,
        code: subject.code,
      },
      position: { x: xPosition, y: yPosition },
      style: nodeStyle,
    })
  }

  function addEdge(sourceId: string, targetId: string): void {
    edges.push({
      id: `e-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      animated: true,
      type: 'bezier',
    })
  }

  const centerSubject = getSubjectById(selectedSubjectId)
  if (!centerSubject) return { nodes: [], edges: [] }

  addNode(centerSubject, 0, 'selected', 0)

  const prerequisiteXOffsets: Record<number, number> = {}
  function processPrerequisites(currentSubjectId: string, level: number): void {
    const currentSubject = getSubjectById(currentSubjectId)
    if (!currentSubject) return

    prerequisiteXOffsets[level] = prerequisiteXOffsets[level] || 0

    currentSubject.prerequisites.forEach((prereqCode) => {
      const prereqSubject = getSubjectByCode(prereqCode)
      if (prereqSubject) {
        if (!processedNodes.has(prereqSubject.id)) {
          addNode(
            prereqSubject,
            level,
            'prerequisite',
            prerequisiteXOffsets[level]++,
          )
        }
        // Ensure edge is from prerequisite to current subject
        addEdge(prereqSubject.id, currentSubject.id)
        if (processedNodes.has(prereqSubject.id) && level < 5) {
          // Avoid infinite loops and excessive depth
          // Only recurse if it's a new path to this node essentially, or if we haven't added it yet
        }
        processPrerequisites(prereqSubject.id, level + 1)
      }
    })
    if (currentSubject.prerequisites.length > 0) {
      prerequisiteXOffsets[level] = 0 // Reset for the next subject at the same level if processing siblings
    }
  }
  processPrerequisites(selectedSubjectId, 1)

  const unlockXOffsets: Record<number, number> = {}
  function processUnlocks(currentSubjectId: string, level: number): void {
    const currentSubject = getSubjectById(currentSubjectId)
    if (!currentSubject) return

    unlockXOffsets[level] = unlockXOffsets[level] || 0

    allSubjects.forEach((s) => {
      // A subject 's' is unlocked by 'currentSubject' if 'currentSubject.code' is in 's.prerequisites'
      if (s.prerequisites.includes(currentSubject.code)) {
        const unlockSubject = s // s is the subject that currentSubject unlocks
        if (!processedNodes.has(unlockSubject.id)) {
          addNode(unlockSubject, level, 'unlock', unlockXOffsets[level]++)
        }
        // Ensure edge is from current subject to the one it unlocks
        addEdge(currentSubject.id, unlockSubject.id)
        if (processedNodes.has(unlockSubject.id) && level < 5) {
          // Avoid infinite loops
          // Only recurse if it's a new path to this node essentially
        }
        processUnlocks(unlockSubject.id, level + 1)
      }
    })
    if (
      allSubjects.filter((s) => s.prerequisites.includes(currentSubject.code))
        .length > 0
    ) {
      unlockXOffsets[level] = 0 // Reset for the next subject at the same level
    }
  }
  processUnlocks(selectedSubjectId, 1)

  const levelsYMap: Record<number, string[]> = {}
  nodes.forEach((node) => {
    const y = node.position.y
    if (!levelsYMap[y]) levelsYMap[y] = []
    levelsYMap[y].push(node.id)
  })

  Object.values(levelsYMap).forEach((nodesAtLevelY) => {
    const count = nodesAtLevelY.length
    if (count > 1) {
      // Sort nodes by their current x to maintain relative order before recentering
      nodesAtLevelY.sort((aId, bId) => {
        const nodeA = nodes.find((n) => n.id === aId)
        const nodeB = nodes.find((n) => n.id === bId)
        return (nodeA?.position.x || 0) - (nodeB?.position.x || 0)
      })

      const totalWidth = count * nodeWidth + (count - 1) * horizontalSpacing
      const startX = -totalWidth / 2 + nodeWidth / 2
      nodesAtLevelY.forEach((nodeId, index) => {
        const node = nodes.find((n) => n.id === nodeId)
        if (node) {
          node.position.x = startX + index * (nodeWidth + horizontalSpacing)
        }
      })
    }
  })

  return { nodes, edges }
}
