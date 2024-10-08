import { motion } from 'framer-motion'
import { useMemo } from 'react'

import type { Subject } from '@/types/course'
import { capitalizeWords } from '@/utils/capitalize-words'

import { SubjectBar } from './subject-bar'

interface SubjectCardProps {
  subject: Subject
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const name = useMemo(() => capitalizeWords(subject.name), [subject.name])

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      key={subject.code}
      className="flex gap-1 bg-transparent  text-[10px] w-38 ring-1 ring-border dark:ring-slate-700 h-24 rounded-lg center text-center flex-shrink-0 px-4 flex-col relative group before:content-[''] before:size-full before:bg-accent before:absolute  before:-z-20 cursor-pointer hover:shadow-lg transition-all duration-300 before:rounded-lg hover:ring-0"
    >
      <span className="font-medium text-xs drop-shadow">{name}</span>

      <SubjectBar nature={subject.nature} branch={subject.branch} />
    </motion.div>
  )
}
