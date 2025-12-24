'use client'

import React, { useMemo, useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { CustomNode } from './custom-node'
import type { Branch, Subject } from '@/types/course'
import { generateDependencyGraph } from '@/utils/react-flow'
import type { NodeData } from '@/types/node'
import { BranchViewer } from './branch-viewer'
import { ModeSelector } from './mode-selector'
import { SubjectDetailsPainel } from './subject-details-painel'

const nodeTypes = {
  customSubject: CustomNode,
}

type HighlightMode = 'direct' | 'full'

interface DependencyViewProps {
  subject: Subject
  allSubjects: Subject[]
  branches: Branch[]
  onBack: () => void
}

export function SubjectView({
  subject,
  allSubjects,
  branches,
  onBack,
}: DependencyViewProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return generateDependencyGraph(subject.id, allSubjects)
  }, [subject, allSubjects])

  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<NodeData>>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges)

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [isPersistent, setIsPersistent] = useState(false)
  const [mode, setMode] = useState<HighlightMode>('full')

  const getDirectNeighbors = useCallback(
    (startNodeId: string) => {
      const highlightedNodes = new Set<string>([startNodeId])
      const highlightedEdges = new Set<string>()
      const ancestorNodes = new Set<string>()
      const descendantNodes = new Set<string>()

      initialEdges.forEach((edge) => {
        if (edge.target === startNodeId) {
          highlightedNodes.add(edge.source)
          ancestorNodes.add(edge.source)
          highlightedEdges.add(edge.id)
        }
        if (edge.source === startNodeId) {
          highlightedNodes.add(edge.target)
          descendantNodes.add(edge.target)
          highlightedEdges.add(edge.id)
        }
      })

      return {
        highlightedNodes,
        highlightedEdges,
        ancestorNodes,
        descendantNodes,
      }
    },
    [initialEdges],
  )

  const getFullDependencyChain = useCallback(
    (startNodeId: string) => {
      const highlightedNodes = new Set<string>([startNodeId])
      const highlightedEdges = new Set<string>()
      const ancestorNodes = new Set<string>()
      const descendantNodes = new Set<string>()

      const traverseAncestors = (nodeId: string) => {
        initialEdges.forEach((edge) => {
          if (edge.target === nodeId) {
            if (!highlightedNodes.has(edge.source)) {
              highlightedNodes.add(edge.source)
              ancestorNodes.add(edge.source)
              highlightedEdges.add(edge.id)
              traverseAncestors(edge.source)
            } else if (!highlightedEdges.has(edge.id)) {
              highlightedEdges.add(edge.id)
            }
          }
        })
      }

      const traverseDescendants = (nodeId: string) => {
        initialEdges.forEach((edge) => {
          if (edge.source === nodeId) {
            if (!highlightedNodes.has(edge.target)) {
              highlightedNodes.add(edge.target)
              descendantNodes.add(edge.target)
              highlightedEdges.add(edge.id)
              traverseDescendants(edge.target)
            } else if (!highlightedEdges.has(edge.id)) {
              highlightedEdges.add(edge.id)
            }
          }
        })
      }

      traverseAncestors(startNodeId)
      traverseDescendants(startNodeId)

      return {
        highlightedNodes,
        highlightedEdges,
        ancestorNodes,
        descendantNodes,
      }
    },
    [initialEdges],
  )

  const applyHighlight = useCallback(
    (nodeId: string | null) => {
      const isDark = document.documentElement.classList.contains('dark')
      const baseEdgeColor = isDark ? '#334155' : '#cbd5e1'
      const dimEdgeColor = isDark ? '#1e293b' : '#e2e8f0'

      if (!nodeId) {
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...n.data, isNeighbor: false, neighborType: null },
            style: { opacity: 1, zIndex: 1 },
          })),
        )

        setEdges((eds) =>
          eds.map((e) => ({
            ...e,
            style: { stroke: baseEdgeColor, strokeWidth: 2, opacity: 1 },
            animated: false,
          })),
        )
        return
      }

      const {
        highlightedNodes,
        highlightedEdges,
        ancestorNodes,
        descendantNodes,
      } =
        mode === 'full'
          ? getFullDependencyChain(nodeId)
          : getDirectNeighbors(nodeId)

      setNodes((nds) =>
        nds.map((n) => {
          const isInChain = highlightedNodes.has(n.id)
          let neighborType: NodeData['neighborType'] = null

          if (ancestorNodes.has(n.id)) neighborType = 'prerequisite'
          else if (descendantNodes.has(n.id)) neighborType = 'unlocked'

          return {
            ...n,
            data: {
              ...n.data,
              isNeighbor: isInChain && n.id !== nodeId,
              neighborType,
            },
            style: isInChain
              ? { opacity: 1, zIndex: 10 }
              : { opacity: 0.1, zIndex: 1 },
          }
        }),
      )

      setEdges((eds) =>
        eds.map((e) => {
          const isHighlighted = highlightedEdges.has(e.id)
          return {
            ...e,
            style: {
              stroke: isHighlighted ? '#3b82f6' : dimEdgeColor,
              strokeWidth: isHighlighted ? 3 : 1,
              opacity: isHighlighted ? 1 : 0.1,
            },
            animated: isHighlighted,
          }
        }),
      )
    },
    [mode, getFullDependencyChain, getDirectNeighbors, setNodes, setEdges],
  )

  useEffect(() => {
    applyHighlight(activeNodeId)
  }, [activeNodeId, applyHighlight, mode])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (isPersistent && activeNodeId === node.id) {
        setIsPersistent(false)
        setActiveNodeId(null)
      } else {
        setIsPersistent(true)
        setActiveNodeId(node.id)
      }
    },
    [isPersistent, activeNodeId],
  )

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!isPersistent) {
        setActiveNodeId(node.id)
      }
    },
    [isPersistent],
  )

  const onNodeMouseLeave = useCallback(() => {
    if (!isPersistent) {
      setActiveNodeId(null)
    }
  }, [isPersistent])

  return (
    <div className="bg-background relative h-dvh w-dvw transition-colors duration-300">
      {/* Subject Info Panel */}

      <SubjectDetailsPainel
        branches={branches}
        subject={subject}
        isPersistent={isPersistent}
        onBack={onBack}
      />

      <ModeSelector mode={mode} setMode={setMode} />

      <BranchViewer />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background
          color={
            document.documentElement.classList.contains('dark')
              ? '#334155'
              : '#cbd5e1'
          }
          gap={20}
          size={1}
        />
        {/* <Controls className="text-foreground [&_button]:bg-accent! [&_button]:border-border! border border-gray-200 shadow-sm dark:border-slate-800 dark:bg-slate-900" /> */}
      </ReactFlow>
    </div>
  )
}
