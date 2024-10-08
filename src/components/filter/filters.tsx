import { motion } from 'framer-motion'

import { BranchPopup } from './popups/branch-popup'
import { DurationPopup } from './popups/duration-popup'
import { SemesterPopup } from './popups/semester-popup'

export function Filters() {
  return (
    <motion.div
      className="flex h-8 items-center gap-2 overflow-hidden"
      initial={{
        opacity: 0,
        x: 20,
        width: 0,
      }}
      animate={{
        opacity: 1,
        width: 'auto',
        marginRight: '0.5rem',
        x: 0,
      }}
      exit={{
        opacity: 0,
        width: 0,
        x: 20,
      }}
      transition={{ duration: 0.2 }}
    >
      <BranchPopup />
      <DurationPopup />
      <SemesterPopup />
    </motion.div>
  )
}
