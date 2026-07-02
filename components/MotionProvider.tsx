'use client'

import { MotionConfig } from 'framer-motion'

/** Global motion config — honors the user's prefers-reduced-motion setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

export default MotionProvider
