import type { HorizonSystem } from '@/lib/types'

export function SpacingSection({ system }: { system: HorizonSystem }) {
  const base = system.spacing?.base ?? 4
  const scale = system.spacing?.scale ?? []

  return (
    <div>
      <p className="mb-4 text-sm text-muted">Base unit: {base}px</p>
      <div className="space-y-2.5">
        {scale.map((v, i) => (
          <div key={i} className="flex items-center gap-4">
            <span className="w-12 shrink-0 text-xs text-muted">{v}px</span>
            <div
              className="h-6 rounded bg-brand-100"
              style={{ width: Math.min(v, 320) }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default SpacingSection
