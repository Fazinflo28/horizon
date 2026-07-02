'use client'

import { useToast } from '@/components/Toast'
import type { HorizonSystem, Palette } from '@/lib/types'

const SHADES: Array<keyof Palette> = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
]

function readableOn(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#1B2559'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1B2559' : '#FFFFFF'
}

export function ColorSection({ system }: { system: HorizonSystem }) {
  const { toast } = useToast()

  const copy = (hex: string) => {
    navigator.clipboard
      ?.writeText(hex)
      .then(() => toast(`Copied ${hex}`, 'success'))
      .catch(() => {})
  }

  const Ramp = ({ label, pal }: { label: string; pal?: Palette }) =>
    pal ? (
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
        <div className="grid grid-cols-10 overflow-hidden rounded-lg">
          {SHADES.map((s) => {
            const hex = pal[s]
            if (!hex) return <div key={s} className="h-14" />
            return (
              <button
                key={s}
                onClick={() => copy(hex)}
                title={hex}
                className="flex h-14 items-end justify-center pb-1 transition-transform hover:scale-[1.04]"
                style={{ background: hex, color: readableOn(hex) }}
              >
                <span className="text-[10px] font-medium">{s}</span>
              </button>
            )
          })}
        </div>
      </div>
    ) : null

  const semantic = system.colors?.semantic

  return (
    <div className="space-y-6">
      <Ramp label="Primary" pal={system.colors?.primary} />
      <Ramp label="Secondary" pal={system.colors?.secondary} />
      <Ramp label="Neutral" pal={system.colors?.neutral} />
      {semantic ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Semantic</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(semantic).map(([name, hex]) => (
              <button
                key={name}
                onClick={() => copy(hex)}
                className="flex h-20 flex-col items-start justify-end rounded-xl p-3 text-left"
                style={{ background: hex, color: readableOn(hex) }}
              >
                <span className="text-sm font-semibold capitalize">{name}</span>
                <span className="text-xs opacity-80">{hex}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ColorSection
