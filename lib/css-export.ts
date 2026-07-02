import type { HorizonSystem, Palette } from '@/lib/types'

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Serialize a HorizonSystem into a :root { --token: value } CSS block.
 * Defensive against partial systems (kit starters, imperfect AI output).
 */
export function systemToCss(system: HorizonSystem): string {
  const lines: string[] = [':root {']

  const groups: Array<['primary' | 'secondary' | 'neutral', Palette | undefined]> =
    [
      ['primary', system.colors?.primary],
      ['secondary', system.colors?.secondary],
      ['neutral', system.colors?.neutral],
    ]
  for (const [name, pal] of groups) {
    if (!pal) continue
    for (const shade of Object.keys(pal)) {
      const value = pal[shade as keyof Palette]
      if (value) lines.push(`  --color-${name}-${shade}: ${value};`)
    }
  }

  const sem = system.colors?.semantic
  if (sem) {
    for (const [k, v] of Object.entries(sem)) {
      lines.push(`  --color-${k}: ${v};`)
    }
  }

  const scale = system.spacing?.scale ?? []
  scale.forEach((v, i) => lines.push(`  --space-${i + 1}: ${v}px;`))

  if (system.radius) {
    lines.push(`  --radius-sm: ${system.radius.sm};`)
    lines.push(`  --radius-md: ${system.radius.md};`)
    lines.push(`  --radius-lg: ${system.radius.lg};`)
    lines.push(`  --radius-full: ${system.radius.full};`)
  }

  ;(system.shadows ?? []).forEach((s) =>
    lines.push(`  --shadow-${slug(s.name)}: ${s.value};`),
  )

  if (system.typography?.fontFamily) {
    lines.push(`  --font-family: ${system.typography.fontFamily};`)
  }

  lines.push('}')
  return lines.join('\n')
}
