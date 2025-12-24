'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps, type Node } from '@xyflow/react'
import { motion } from 'motion/react'
import { SubjectBar } from '../../components/subject-bar'
import type { NodeData } from '@/types/node'

export const CustomNode = memo(function CustomNode({
  data,
}: NodeProps<Node<NodeData>>) {
  const { label, code, isSelected, isNeighbor, nature, branchIds } = data

  // Em ReactFlow, o destaque vem de isSelected ou isNeighbor
  const selectedStatus = isSelected || isNeighbor ? 'selected' : ''

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="group before:bg-accent relative flex h-24 w-52 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg bg-transparent px-4 text-center ring-1 ring-slate-200 transition-all duration-300 before:absolute before:-z-20 before:size-full before:rounded-lg before:content-[''] after:absolute after:right-0 after:-z-10 after:size-full after:rounded-lg after:bg-black after:opacity-0 after:content-[''] hover:shadow-lg hover:ring-0 active:scale-95 data-[selected=selected]:shadow-lg data-[selected=selected]:ring-0 dark:ring-slate-800 dark:after:opacity-15"
      data-selected={selectedStatus}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="h-2 w-2 border-none bg-slate-400 dark:bg-slate-600"
      />

      <div className="subject-content relative z-10 flex flex-col items-center">
        <span className="text-foreground/70 mb-1 text-[10px] font-bold uppercase transition-colors">
          {code}
        </span>
        <span className="text-foreground text-xs leading-tight font-medium transition-colors">
          {label}
        </span>
      </div>

      {branchIds && <SubjectBar nature={nature} branch={branchIds} />}

      <Handle
        type="source"
        position={Position.Right}
        className="h-2 w-2 border-none bg-slate-400 dark:bg-slate-600"
      />
    </motion.div>
  )
})
