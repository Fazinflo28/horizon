'use client'

/**
 * Chip selector for the simple filter panels (industry, platform,
 * accessibility, figma, device). Single-select stores 0 or 1 value; multi
 * stores any number.
 */
export function SimplePanel({
  options,
  multi,
  selected,
  onChange,
}: {
  options: string[]
  multi: boolean
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const isOn = (o: string) => selected.includes(o)

  const toggle = (o: string) => {
    if (multi) {
      onChange(isOn(o) ? selected.filter((x) => x !== o) : [...selected, o])
    } else {
      onChange(isOn(o) ? [] : [o])
    }
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => toggle(o)}
          className={`h-10 rounded-full border px-4 text-sm transition-colors ${
            isOn(o)
              ? 'border-brand bg-brand text-white'
              : 'border-line bg-white text-muted hover:text-ink'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export default SimplePanel
