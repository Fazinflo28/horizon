'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/** The two floating spheres on the brand gradient panel (splash / sign-in). */
export function BrandSpheres() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.to('.brand-sphere-1', {
        y: 26,
        x: 12,
        duration: 8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })
      gsap.to('.brand-sphere-2', {
        y: -22,
        x: -14,
        duration: 6.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={ref} aria-hidden>
      <div
        className="brand-sphere-1 pointer-events-none absolute rounded-full"
        style={{
          width: 280,
          height: 280,
          left: '6%',
          top: '42%',
          background: 'radial-gradient(circle at 35% 30%, #6D7BFF, #2C3AD8 72%)',
          opacity: 0.9,
        }}
      />
      <div
        className="brand-sphere-2 pointer-events-none absolute rounded-full"
        style={{
          width: 190,
          height: 190,
          right: '12%',
          top: '12%',
          background: 'radial-gradient(circle at 35% 30%, #5B6BF5, #2734C9 72%)',
          opacity: 0.9,
        }}
      />
    </div>
  )
}

export default BrandSpheres
