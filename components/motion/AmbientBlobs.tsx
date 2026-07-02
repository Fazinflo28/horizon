'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Blob = {
  size: number
  top?: string
  bottom?: string
  left?: string
  right?: string
  opacity?: number
}

const DEFAULT_BLOBS: Blob[] = [
  { size: 420, left: '-5%', bottom: '6%', opacity: 0.6 },
  { size: 300, right: '10%', top: '28%', opacity: 0.55 },
  { size: 340, right: '-4%', bottom: '14%', opacity: 0.5 },
]

/** Decorative gradient blobs that drift gently forever (GSAP). Pure decoration. */
export function AmbientBlobs({ blobs = DEFAULT_BLOBS }: { blobs?: Blob[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.ambient-blob').forEach((el, i) => {
        gsap.to(el, {
          x: i % 2 ? -18 : 18,
          y: i % 2 ? 22 : -22,
          duration: 7 + i * 1.6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {blobs.map((b, i) => (
        <div
          key={i}
          className="ambient-blob absolute rounded-full blur-3xl"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            bottom: b.bottom,
            left: b.left,
            right: b.right,
            opacity: b.opacity ?? 0.55,
            background:
              'radial-gradient(circle, #DDE4FF 0%, rgba(221,228,255,0) 70%)',
          }}
        />
      ))}
    </div>
  )
}

export default AmbientBlobs
