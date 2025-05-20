'use client'

import '@xyflow/react/dist/style.css'

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MarkerType, type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState
} from '@xyflow/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { generateFlowData } from '@/lib/graph-utils'
import type { Subject } from '@/types/course'

// Interface for node data, matching what generateFlowData provides in node.data
interface SubjectNodeData {
  label: string
  duration: number
  color: string // Background color for the node
  textColor: string // Text color for the node
  id: string
  code: string
}

const nodeColor = (node: Node<SubjectNodeData>) => {
  return node.data.color
}

// Define hover colors (using CSS variables for theming)
const HOVERED_NODE_BORDER_COLOR = 'hsl(var(--ring))' // Ring color for strong emphasis
const HOVERED_NODE_BORDER_WIDTH = '4px'

const PREREQ_HIGHLIGHT_BORDER_COLOR = 'hsl(var(--chart-4))' // Yellowish
const PREREQ_HIGHLIGHT_BORDER_WIDTH = '3px'

const UNLOCK_HIGHLIGHT_BORDER_COLOR = 'hsl(var(--chart-2))' // Greenish/Teal
const UNLOCK_HIGHLIGHT_BORDER_WIDTH = '3px'

const HOVER_EDGE_STROKE_COLOR = 'hsl(var(--destructive))' // Destructive color for visibility
const HOVER_EDGE_STROKE_WIDTH = 3

export function ReactFlowDiagram({
  selectedSubject,
  allSubjects,
}: {
  selectedSubject: Subject | null
  allSubjects: Subject[]
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<SubjectNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)

  // Store original nodes and edges to revert hover effects
  const [originalNodes, setOriginalNodes] = useState<Node<SubjectNodeData>[]>(
    [],
  )
  const [originalEdges, setOriginalEdges] = useState<Edge[]>([])

  const defaultEdgeOptions = useMemo(
    () => ({
      animated: false, // Turn off default animation, can make hover animation more prominent if added
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: 'hsl(var(--primary))',
      },
      style: {
        strokeWidth: 2,
        stroke: 'hsl(var(--primary))',
      },
    }),
    [],
  )

  useEffect(() => {
    if (selectedSubject) {
      setLoading(true)
      // Simulate a short delay for data processing
      setTimeout(() => {
        const { nodes: newNodes, edges: newEdges } = generateFlowData(
          selectedSubject.id,
          allSubjects,
        )
        const typedNodes = newNodes as Node<SubjectNodeData>[]
        setNodes(typedNodes)
        setEdges(newEdges)
        setOriginalNodes(typedNodes) // Store original for hover reset
        setOriginalEdges(newEdges) // Store original for hover reset
        setLoading(false)
      }, 100)
    } else {
      setNodes([])
      setEdges([])
      setOriginalNodes([])
      setOriginalEdges([])
      setLoading(false)
    }
  }, [selectedSubject, allSubjects, setNodes, setEdges])

  const onNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node<SubjectNodeData>) => {
      if (!selectedSubject) return

      const hoveredNodeId = node.id
      const hoveredSubjectInstance = allSubjects.find(
        (s) => s.id === hoveredNodeId,
      )
      if (!hoveredSubjectInstance) return

      const directPrereqCodes = hoveredSubjectInstance.prerequisites
      const directPrereqIds = directPrereqCodes
        .map((code) => allSubjects.find((s) => s.code === code)?.id)
        .filter((id): id is string => !!id)

      const directUnlockIds = allSubjects
        .filter((s) => s.prerequisites.includes(hoveredSubjectInstance.code))
        .map((s) => s.id)

      setNodes((nds) =>
        nds.map((n) => {
          let styleUpdate = {}
          if (n.id === hoveredNodeId) {
            styleUpdate = {
              borderColor: HOVERED_NODE_BORDER_COLOR,
              borderWidth: HOVERED_NODE_BORDER_WIDTH,
              boxShadow: `0 0 10px ${HOVERED_NODE_BORDER_COLOR}`,
            }
          } else if (directPrereqIds.includes(n.id)) {
            styleUpdate = {
              borderColor: PREREQ_HIGHLIGHT_BORDER_COLOR,
              borderWidth: PREREQ_HIGHLIGHT_BORDER_WIDTH,
            }
          } else if (directUnlockIds.includes(n.id)) {
            styleUpdate = {
              borderColor: UNLOCK_HIGHLIGHT_BORDER_COLOR,
              borderWidth: UNLOCK_HIGHLIGHT_BORDER_WIDTH,
            }
          }
          return { ...n, style: { ...n.style, ...styleUpdate } }
        }),
      )

      setEdges((eds) =>
        eds.map((e) => {
          const isPrereqEdge =
            directPrereqIds.includes(e.source) && e.target === hoveredNodeId
          const isUnlockEdge =
            e.source === hoveredNodeId && directUnlockIds.includes(e.target)

          if (isPrereqEdge || isUnlockEdge) {
            return {
              ...e,
              style: {
                ...e.style,
                stroke: HOVER_EDGE_STROKE_COLOR,
                strokeWidth: HOVER_EDGE_STROKE_WIDTH,
              },
              markerEnd: { ...e.markerEnd, color: HOVER_EDGE_STROKE_COLOR },
              zIndex: 1000, // Bring highlighted edges to front
            }
          }
          return e
        }),
      )
    },
    [allSubjects, selectedSubject, setNodes, setEdges],
  )

  const onNodeMouseLeave = useCallback(
    (_event: React.MouseEvent, _node: Node<SubjectNodeData>) => {
      if (!selectedSubject) return
      // Revert to original styles
      setNodes(originalNodes)
      setEdges(originalEdges)
    },
    [selectedSubject, originalNodes, originalEdges, setNodes, setEdges],
  )

  if (loading) {
    return (
      <div className="bg-card flex h-[600px] w-full items-center justify-center rounded-lg border">
        <div className="space-y-4 p-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!selectedSubject) {
    return (
      <div className="bg-card flex h-[600px] w-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground">
          Select a subject to see its dependencies.
        </p>
      </div>
    )
  }

  if (nodes.length === 0 && !loading) {
    return (
      <div className="bg-card flex h-[600px] w-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground">
          No dependency data to display for {selectedSubject.name}.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card h-[600px] w-full overflow-hidden rounded-lg border shadow-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Controls />

        <Background
          variant={BackgroundVariant.Dots}
          color="hsl(var(--border))"
          gap={16}
        />
      </ReactFlow>
    </div>
  )
}

export default function ReactFlowDiagramWrapper(props: {
  selectedSubject: Subject | null
  allSubjects: Subject[]
}) {
  return (
    <ReactFlowProvider>
      <ReactFlowDiagram {...props} />
    </ReactFlowProvider>
  )
}
