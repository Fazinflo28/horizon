import type { HorizonSystem } from '@/lib/types'

export function ShapeSection({ system }: { system: HorizonSystem }) {
  const r = system.radius
  const radii = r
    ? ([
        ['sm', r.sm],
        ['md', r.md],
        ['lg', r.lg],
        ['full', r.full],
      ] as const)
    : []
  const shadows = system.shadows ?? []

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm font-semibold text-ink">Corner Radius</p>
        <div className="flex flex-wrap gap-5">
          {radii.map(([name, val]) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div
                className="h-[72px] w-[72px] border border-line bg-surface"
                style={{ borderRadius: val }}
              />
              <span className="text-xs text-muted">
                {name} · {val}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-ink">Elevation</p>
        <div className="flex flex-wrap gap-5">
          {shadows.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="h-[72px] w-[72px] rounded-xl bg-surface"
                style={{ boxShadow: s.value }}
              />
              <span className="text-xs text-muted">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ShapeSection
