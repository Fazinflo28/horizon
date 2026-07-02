'use client'

import { useEffect } from 'react'

/**
 * Injects a Google Fonts <link> once for the given family so the canvas can
 * render samples in the actual generated font. Silently no-ops on failure.
 */
export function useGoogleFont(family?: string): void {
  useEffect(() => {
    if (!family) return
    const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`
    if (document.getElementById(id)) return
    try {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${family.replace(
        / /g,
        '+',
      )}:wght@400;600;700&display=swap`
      document.head.appendChild(link)
    } catch {
      // ignore — sample text falls back to the inherited font
    }
  }, [family])
}

export default useGoogleFont
