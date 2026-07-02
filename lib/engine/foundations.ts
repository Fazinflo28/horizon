import type {
  Decisions,
  GenerationFilters,
  Palette,
  RadiusCharacter,
  SemanticToken,
  TypeStep,
} from '@/lib/types'
import {
  enforceContrast,
  generateNeutralRamp,
  generateRamp,
  semanticColors,
} from './color'
import { buildScale, TYPE_LADDER } from './typography'

export interface Foundations {
  primary: Palette
  secondary: Palette
  neutral: Palette
  semantic: { success: string; warning: string; error: string; info: string }
  accessibleShade: keyof Palette
  scale: TypeStep[]
  spacing: { base: number; scale: number[] }
  radius: { sm: string; md: string; lg: string; full: string }
  shadows: Array<{ name: string; value: string }>
  semanticTokens: SemanticToken[]
  radiusCharacter: RadiusCharacter
}

const RADIUS_MAP: Record<
  RadiusCharacter,
  { sm: string; md: string; lg: string }
> = {
  sharp: { sm: '2px', md: '4px', lg: '8px' },
  soft: { sm: '4px', md: '8px', lg: '12px' },
  rounded: { sm: '6px', md: '12px', lg: '16px' },
  pill: { sm: '8px', md: '16px', lg: '24px' },
}

const SPACING_BASE: Record<string, number> = {
  '4pt Scale': 4,
  '8pt Scale': 8,
  '12pt Scale': 12,
  '16pt Scale': 16,
}

const SPACING_MULTIPLIERS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20]

export function buildFoundations(
  decisions: Decisions,
  filters: GenerationFilters,
): Foundations {
  const target: 4.5 | 7 = filters.accessibility.includes('WCAG AAA') ? 7 : 4.5

  const primaryEnforced = enforceContrast(
    generateRamp(decisions.primarySeed),
    target,
  )
  const secondaryEnforced = enforceContrast(
    generateRamp(decisions.secondarySeed),
    target,
  )
  const primary = primaryEnforced.palette
  const secondary = secondaryEnforced.palette
  const neutral = generateNeutralRamp(decisions.neutralTint)
  const semantic = semanticColors(target)
  const accessibleShade = primaryEnforced.accessibleShade

  // Spacing — smallest selected base, default 4.
  const selectedBases = filters.global
    .filter((g) => g in SPACING_BASE)
    .map((g) => SPACING_BASE[g])
  const base = selectedBases.length > 0 ? Math.min(...selectedBases) : 4
  const scaleValues = Array.from(
    new Set(SPACING_MULTIPLIERS.map((m) => m * base)),
  ).sort((a, b) => a - b)

  // Typography — from the Global panel Typography selections.
  const selectedTypeSteps = filters.global.filter((g) =>
    (TYPE_LADDER as readonly string[]).includes(g),
  )
  const scale = buildScale(decisions.typeRatio, selectedTypeSteps)

  // Radius character.
  const r = RADIUS_MAP[decisions.radiusCharacter]
  const radius = { sm: r.sm, md: r.md, lg: r.lg, full: '9999px' }

  const shadows = [
    { name: 'sm', value: '0 1px 2px rgba(16,24,40,0.06)' },
    { name: 'md', value: '0 4px 12px rgba(16,24,40,0.10)' },
    { name: 'lg', value: '0 12px 32px rgba(16,24,40,0.14)' },
    { name: 'focus', value: `0 0 0 3px ${primary['100']}` },
  ]

  const semanticTokens: SemanticToken[] = [
    { name: 'color-bg-page', value: neutral['50'], ref: 'neutral.50' },
    { name: 'color-bg-surface', value: '#FFFFFF', ref: null },
    { name: 'color-bg-brand', value: primary['600'], ref: 'primary.600' },
    { name: 'color-bg-brand-hover', value: primary['700'], ref: 'primary.700' },
    { name: 'color-text-primary', value: neutral['900'], ref: 'neutral.900' },
    { name: 'color-text-secondary', value: neutral['600'], ref: 'neutral.600' },
    { name: 'color-text-muted', value: neutral['400'], ref: 'neutral.400' },
    { name: 'color-text-on-brand', value: '#FFFFFF', ref: null },
    {
      name: 'color-text-brand',
      value: primary[accessibleShade],
      ref: `primary.${accessibleShade}`,
    },
    { name: 'color-border', value: neutral['200'], ref: 'neutral.200' },
    { name: 'color-border-strong', value: neutral['300'], ref: 'neutral.300' },
    { name: 'color-border-focus', value: primary['500'], ref: 'primary.500' },
    { name: 'color-success', value: semantic.success, ref: null },
    { name: 'color-warning', value: semantic.warning, ref: null },
    { name: 'color-error', value: semantic.error, ref: null },
    { name: 'color-info', value: semantic.info, ref: null },
  ]

  return {
    primary,
    secondary,
    neutral,
    semantic,
    accessibleShade,
    scale,
    spacing: { base, scale: scaleValues },
    radius,
    shadows,
    semanticTokens,
    radiusCharacter: decisions.radiusCharacter,
  }
}
