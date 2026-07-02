import type { HorizonSystem } from '@/lib/types'

export function TypographySection({ system }: { system: HorizonSystem }) {
  const scale = system.typography?.scale ?? []
  const fontFamily = system.typography?.fontFamily

  return (
    <div className="space-y-6">
      {scale.map((step, i) => {
        const rawSize = parseFloat(step.size) || 16
        const renderSize = Math.min(rawSize, 56)
        return (
          <div
            key={i}
            className="flex flex-col gap-2 border-b border-line pb-6 last:border-0 md:flex-row md:items-baseline md:justify-between"
          >
            <span
              className="truncate text-ink"
              style={{
                fontSize: renderSize,
                lineHeight: 1.1,
                fontWeight: step.weight,
                fontFamily,
              }}
            >
              The quick brown fox
            </span>
            <div className="shrink-0 md:text-right">
              <p className="text-sm font-semibold text-ink">{step.name}</p>
              <p className="text-xs text-muted">
                {step.size} / {step.lineHeight} / {step.weight}
              </p>
              <p className="text-xs text-muted">{step.usage}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TypographySection
