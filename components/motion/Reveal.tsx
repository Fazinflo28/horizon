'use client'

import { motion } from 'framer-motion'

/**
 * Subtle fade + rise on mount. Compose a stagger by passing increasing `delay`s.
 * Honors reduced-motion via the global MotionConfig.
 */
export function Reveal({
  children,
  delay = 0,
  y = 12,
  duration = 0.5,
  className,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  duration?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default Reveal
