'use client'

import { Heart, User } from 'lucide-react'
import type { ShopKit } from '@/lib/types'

export function formatCount(n: number): string {
  if (n >= 100000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${n}`
}

function firstHex(gradient: string): string {
  const m = gradient.match(/#([0-9A-Fa-f]{6})/)
  return m ? `#${m[1]}` : '#EEF2FF'
}

/** White text on dark cover gradients, ink on light ones. */
export function coverTextColor(gradient: string): string {
  const hex = firstHex(gradient).replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum < 0.5 ? '#FFFFFF' : '#1B2559'
}

export function KitCard({
  kit,
  onOpen,
}: {
  kit: ShopKit
  onOpen: (kit: ShopKit) => void
}) {
  const textColor = coverTextColor(kit.cover_gradient)

  return (
    <button
      onClick={() => onOpen(kit)}
      className="group block text-left transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div
        className="relative flex h-[180px] flex-col justify-between overflow-hidden rounded-xl p-5 shadow-card transition-shadow group-hover:shadow-pop"
        style={{ background: kit.cover_gradient }}
      >
        <span
          className="inline-flex w-fit rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm"
          style={{ color: textColor }}
        >
          {kit.industry}
        </span>
        <p className="text-xl font-bold leading-tight" style={{ color: textColor }}>
          {kit.title}
        </p>
      </div>

      <p className="mt-3 truncate text-[15px] font-semibold text-ink">
        {kit.title}
      </p>
      <p className="text-xs text-muted">
        by {kit.author} &nbsp;•&nbsp; {kit.is_free ? 'Free' : 'Paid'}
      </p>
      <div className="mt-1 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Heart size={14} /> {formatCount(kit.likes)}
        </span>
        <span className="flex items-center gap-1">
          <User size={14} /> {formatCount(kit.views)}
        </span>
      </div>
    </button>
  )
}

export default KitCard
