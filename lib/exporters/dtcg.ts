import type { HorizonSystem, Palette } from '@/lib/types'

type ColorToken = { $type: 'color'; $value: string }
type DimToken = { $type: 'dimension'; $value: string }
type ShadowToken = { $type: 'shadow'; $value: string }
type TypographyToken = {
  $type: 'typography'
  $value: {
    fontFamily: string
    fontSize: string
    fontWeight: number
    lineHeight: string
  }
}

/** W3C Design Tokens Community Group (DTCG) format. */
export function systemToDtcg(system: HorizonSystem): string {
  const colorGroup = (pal: Palette): Record<string, ColorToken> => {
    const out: Record<string, ColorToken> = {}
    for (const [k, v] of Object.entries(pal)) out[k] = { $type: 'color', $value: v }
    return out
  }

  const semantic: Record<string, ColorToken> = {}
  for (const t of system.semanticTokens ?? []) {
    semantic[t.name.replace(/^color-/, '')] = { $type: 'color', $value: t.value }
  }
  if (Object.keys(semantic).length === 0 && system.colors?.semantic) {
    for (const [k, v] of Object.entries(system.colors.semantic)) {
      semantic[k] = { $type: 'color', $value: v }
    }
  }

  const spacing: Record<string, DimToken> = {}
  ;(system.spacing?.scale ?? []).forEach((v, i) => {
    spacing[String(i + 1)] = { $type: 'dimension', $value: `${v}px` }
  })

  const radius: Record<string, DimToken> = {}
  if (system.radius) {
    for (const [k, v] of Object.entries(system.radius)) {
      radius[k] = { $type: 'dimension', $value: v }
    }
  }

  const font = system.typography?.fontFamily ?? 'Inter'
  const typography: Record<string, TypographyToken> = {}
  for (const step of system.typography?.scale ?? []) {
    typography[step.name] = {
      $type: 'typography',
      $value: {
        fontFamily: font,
        fontSize: step.size,
        fontWeight: step.weight,
        lineHeight: step.lineHeight,
      },
    }
  }

  const shadow: Record<string, ShadowToken> = {}
  for (const s of system.shadows ?? []) {
    shadow[s.name] = { $type: 'shadow', $value: s.value }
  }

  return JSON.stringify(
    {
      color: {
        primary: colorGroup(system.colors.primary),
        secondary: colorGroup(system.colors.secondary),
        neutral: colorGroup(system.colors.neutral),
        semantic,
      },
      spacing,
      radius,
      typography,
      shadow,
    },
    null,
    2,
  )
}
