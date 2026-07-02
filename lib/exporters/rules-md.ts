import type { HorizonSystem, TypeStep } from '@/lib/types'
import { systemToCss } from './css'

const USE_FOR: Record<string, string> = {
  'color-bg-page': 'Page background',
  'color-bg-surface': 'Cards, sheets, menus',
  'color-bg-brand': 'Primary buttons, active fills',
  'color-bg-brand-hover': 'Primary hover state',
  'color-text-primary': 'Headings and body text',
  'color-text-secondary': 'Secondary / supporting text',
  'color-text-muted': 'Placeholders, captions',
  'color-text-on-brand': 'Text on brand fills',
  'color-text-brand': 'Links and brand text',
  'color-border': 'Default borders and dividers',
  'color-border-strong': 'Emphasized borders',
  'color-border-focus': 'Focus rings (always visible)',
  'color-success': 'Success status only',
  'color-warning': 'Warning status only',
  'color-error': 'Error / destructive status',
  'color-info': 'Informational status',
}

function bodyStep(scale: TypeStep[]): TypeStep | undefined {
  return scale.find((s) => s.name === 'Body Large') ?? scale.find((s) => /body/i.test(s.name)) ?? scale[scale.length - 1]
}
function bodySmallStep(scale: TypeStep[]): TypeStep | undefined {
  return scale.find((s) => s.name === 'Body Small') ?? scale[scale.length - 1]
}

export function systemToRulesMd(system: HorizonSystem): string {
  const p = system.meta?.decisions?.personality ?? ['clear', 'consistent', 'accessible']
  const platform = system.meta?.filters?.platform
  const devices = system.meta?.filters?.devices ?? []
  const isMobile =
    platform === 'iOS' || platform === 'Android' || devices.includes('Mobile')
  const minTouch = isMobile ? 44 : 40
  const font = system.typography?.fontFamily ?? 'Inter'
  const scale = system.typography?.scale ?? []
  const body = bodyStep(scale)
  const bodySmall = bodySmallStep(scale)
  const tokens = system.semanticTokens ?? []
  const spacingScale = system.spacing?.scale ?? []

  const colorRows = tokens
    .map((t) => `| \`--${t.name}\` | \`${t.value}\` | ${USE_FOR[t.name] ?? '—'} |`)
    .join('\n')

  const typeRows = scale
    .map(
      (s) =>
        `| ${s.name} | ${s.size} / ${s.lineHeight} / ${s.weight} | ${s.usage} |`,
    )
    .join('\n')

  const componentBlocks = (system.components ?? [])
    .map((c) => {
      return `### ${c.type}
- Variants: ${c.variants.join(', ')}
- States: ${c.states.join(', ')}
- Specs: height ${c.specs.height}, padding-x ${c.specs.paddingX}, radius ${c.specs.radius}, font-size ${c.specs.fontSize}
- ${c.guidelines || 'Use consistently with system tokens.'}`
    })
    .join('\n\n')

  return `# ${system.name} Design System Rules

> Feed this file to your AI coding tool (Cursor rules, CLAUDE.md, Lovable, v0, Bolt). Follow it strictly for every screen.

## Identity
${system.description} Personality: ${p[0]}, ${p[1]}, ${p[2]}.

## Hard Rules
1. ONLY use the colors, spacing, radii and type styles defined below. Never invent values.
2. Reference colors via the CSS variables provided.
3. Minimum touch target ${minTouch}px. Focus states always visible using \`--color-border-focus\`.
4. Body text is ${body?.size ?? '16px'} ${font}. Never go below ${bodySmall?.size ?? '14px'}.

## Color Tokens
| Token | Value | Use for |
| --- | --- | --- |
${colorRows}

## Typography
| Step | Size / Line height / Weight | Usage |
| --- | --- | --- |
${typeRows}

## Spacing
Base unit ${system.spacing?.base ?? 4}px. Allowed values: ${spacingScale.map((v) => `${v}px`).join(', ')}. Never use values outside this scale.

## Radius & Elevation
- Radius: sm ${system.radius?.sm}, md ${system.radius?.md}, lg ${system.radius?.lg}, full ${system.radius?.full}
- Shadows: ${(system.shadows ?? []).map((s) => `${s.name} (${s.value})`).join('; ')}

## Components
${componentBlocks}

## CSS Variables
\`\`\`css
${systemToCss(system)}
\`\`\`
`
}
