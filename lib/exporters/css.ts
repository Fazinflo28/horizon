import type { HorizonSystem, Palette } from '@/lib/types'

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function cssFont(family: string, fallback: string): string {
  return `'${family}', ${fallback}`
}

/**
 * Serialize a HorizonSystem to CSS custom properties: a :root block with all
 * primitive shades, semantic tokens (resolved), fonts, spacing, radius and
 * shadows — plus a second block aliasing semantic tokens to their primitives.
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

  const tokens = system.semanticTokens ?? []
  if (tokens.length > 0) {
    for (const t of tokens) lines.push(`  --${t.name}: ${t.value};`)
  } else if (system.colors?.semantic) {
    for (const [k, v] of Object.entries(system.colors.semantic)) {
      lines.push(`  --color-${k}: ${v};`)
    }
  }

  if (system.typography?.fontFamily) {
    lines.push(
      `  --font-family: ${cssFont(system.typography.fontFamily, 'system-ui, sans-serif')};`,
    )
  }
  if (system.typography?.fontFamilyMono) {
    lines.push(
      `  --font-family-mono: ${cssFont(system.typography.fontFamilyMono, 'monospace')};`,
    )
  }

  ;(system.spacing?.scale ?? []).forEach((v, i) =>
    lines.push(`  --space-${i + 1}: ${v}px;`),
  )

  if (system.radius) {
    lines.push(`  --radius-sm: ${system.radius.sm};`)
    lines.push(`  --radius-md: ${system.radius.md};`)
    lines.push(`  --radius-lg: ${system.radius.lg};`)
    lines.push(`  --radius-full: ${system.radius.full};`)
  }

  ;(system.shadows ?? []).forEach((s) =>
    lines.push(`  --shadow-${slug(s.name)}: ${s.value};`),
  )

  lines.push('}')

  // Second block — semantic tokens aliased to their primitive variables.
  const aliased = tokens.filter((t) => t.ref)
  if (aliased.length > 0) {
    lines.push('', '/* semantic aliases */', ':root {')
    for (const t of aliased) {
      const prim = (t.ref as string).replace('.', '-')
      lines.push(`  --${t.name}: var(--color-${prim});`)
    }
    lines.push('}')
  }

  return lines.join('\n')
}
